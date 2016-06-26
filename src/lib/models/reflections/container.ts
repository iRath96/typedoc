import {Reflection, ReflectionKind, ReflectionFlag, ITraverseCallback, TraverseProperty} from "./abstract";
import {ReflectionGroup} from "../ReflectionGroup";
import {DeclarationReflection} from "./declaration";


export class ContainerReflection extends Reflection
{
    /**
     * The children of this reflection.
     */
    children:DeclarationReflection[];
    
    /**
     * The re-exported modules identified by their absolute paths.
     */
    wildcardImports:string[];
    
    /**
     * Returns children and re-exports from other modules.
     */
    getChildrenAndReExports() {
        var root: Reflection = this;
        while(!root.isProject())
            root = root.parent;

        var moduleMap = (<ContainerReflection>root).children.reduce((hash, child) => {
            if(child instanceof ContainerReflection)
                hash[child.originalName] = child;
            return hash;
        }, <{[originalName:string]:ContainerReflection}>{})

        var children = (this.children || []).concat([]);
        (this.wildcardImports || []).forEach(wildcardImport => {
            var reflection = moduleMap[wildcardImport];
            if(!reflection)
                throw new Error("Re-exported module not found");
            
            var exportedChildren = reflection.getChildrenAndReExports().filter(child =>
               child.flags.isExported 
            );
            
            children = children.concat(exportedChildren.map(child => {
                var copy:DeclarationReflection = <any>{};
                for(var i in child)
                    copy[i] = child[i];

                copy.setFlag(ReflectionFlag.Exported, true);
                copy.setFlag(ReflectionFlag.ExportAssignment, true);
                // copy.inheritedFrom = 

                return copy;
            }));
        });

        return children;
    }
    
    /**
     * All children grouped by their kind.
     */
    groups:ReflectionGroup[];



    /**
     * Return a list of all children and re-exports of a certain kind.
     *
     * @param kind  The desired kind of children.
     * @returns     An array containing all children with the desired kind.
     */
    getChildrenByKind(kind:ReflectionKind):DeclarationReflection[] {
        var values:DeclarationReflection[] = [];
        var children = this.getChildrenAndReExports();
        for (var key in children) {
            var child = children[key];
            if (child.kindOf(kind)) {
                values.push(child);
            }
        }
        return values;
    }


    /**
     * Traverse all potential child reflections of this reflection including re-exports.
     *
     * The given callback will be invoked for all children, signatures and type parameters
     * attached to this reflection.
     *
     * @param callback  The callback function that should be applied for each child reflection.
     */
    traverse(callback:ITraverseCallback) {
        var children = this.getChildrenAndReExports();
        children.forEach((child:DeclarationReflection) => {
            callback(child, TraverseProperty.Children);
        });
    }


    /**
     * Return a raw object representation of this reflection.
     */
    toObject():any {
        var result = super.toObject();

        if (this.groups) {
            var groups:any[] = [];
            this.groups.forEach((group) => {
                groups.push(group.toObject())
            });

            result['groups'] = groups;
        }

        return result;
    }
}
