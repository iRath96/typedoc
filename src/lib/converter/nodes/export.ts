import * as ts from "typescript";

import {Reflection, ReflectionKind, ReflectionFlag, DeclarationReflection, ContainerReflection} from "../../models/index";
import {Context} from "../context";
import {Component, ConverterNodeComponent} from "../components";


@Component({name:'node:export'})
export class ExportConverter extends ConverterNodeComponent<ts.ExportAssignment>
{
    /**
     * List of supported TypeScript syntax kinds.
     */
    supports:ts.SyntaxKind[] = [
        ts.SyntaxKind.ExportAssignment,
        ts.SyntaxKind.ExportDeclaration
    ];

    convert(context:Context, node:ts.ExportAssignment|ts.ExportDeclaration):Reflection {
        if(node.kind === ts.SyntaxKind.ExportAssignment) {
            this.convertExportAssignment(context, <ts.ExportAssignment>node);
        } else if(node.kind === ts.SyntaxKind.ExportDeclaration) {
            this.convertExportDeclaration(context, <ts.ExportDeclaration>node);
        }
        
        return context.scope;
    }
    
    private convertExportAssignment(context:Context, node:ts.ExportAssignment):Reflection {
        function markAsExported(reflection:Reflection) {
            if (reflection instanceof DeclarationReflection) {
                (<DeclarationReflection>reflection).setFlag(ReflectionFlag.Exported, true);
            }

            reflection.traverse(markAsExported);
        }

        if (!node.isExportEquals) {
            return context.scope;
        }

        var type = context.getTypeAtLocation(node.expression);
        if (type && type.symbol) {
            var project = context.project;
            type.symbol.declarations.forEach((declaration) => {
                if (!declaration.symbol) return;
                var id = project.symbolMapping[context.getSymbolID(declaration.symbol)];
                if (!id) return;

                var reflection = project.reflections[id];
                if (reflection instanceof DeclarationReflection) {
                    (<DeclarationReflection>reflection).setFlag(ReflectionFlag.ExportAssignment, true);
                }
                markAsExported(reflection);
            });
        }

        return context.scope;
    }
    
    private convertExportDeclaration(context:Context, node:ts.ExportDeclaration):Reflection {
        function markAsExported(reflection:Reflection) {
            if (reflection instanceof DeclarationReflection) {
                (<DeclarationReflection>reflection).setFlag(ReflectionFlag.Exported, true);
            }

            reflection.traverse(markAsExported);
        }

        if(node.exportClause) {
            node.exportClause.elements.forEach((element) => {
                var type = context.getTypeAtLocation(element);
                if (type && type.symbol) {
                    var createDeclaration = require("../factories/index").createDeclaration;
                    var variable = createDeclaration(context, node, ReflectionKind.Property, element.name.text);
                    variable.type = this.owner.convertType(context, node, type);
                    markAsExported(<Reflection>variable);
                    
                    /*
                    var project = context.project;
                    type.symbol.declarations.forEach(function (declaration) {
                        if (!declaration.symbol)
                            return;
                        
                        var id = project.symbolMapping[context.getSymbolID(declaration.symbol)];
                        if (!id)
                            return;
                        
                        var reflection = project.reflections[id];
                        if (reflection instanceof DeclarationReflection) {
                            reflection.setFlag(ReflectionFlag.ExportAssignment, true);
                        }
                        
                        markAsExported(reflection);
                    });*/
                }
            });
        } else if(node.moduleSpecifier) {
            //console.log(node.moduleSpecifier.text);
            //console.log(node);
            
            var type = context.getTypeAtLocation(node);
            //console.log(node.parent.resolvedModules);
            
            if(node.parent.kind !== ts.SyntaxKind.SourceFile)
                throw new Error("Expected ExportDeclaration parent to be a SourceFile");
            
            var sourceFile = <ts.SourceFile>node.parent;
            
            var moduleName = (<any>node.moduleSpecifier).text;
            var modulePath = sourceFile.resolvedModules[moduleName].resolvedFileName;
            if(!modulePath)
                throw new Error("Could not resolve module path");
            
            var scope = context.scope;
            if(scope instanceof ContainerReflection) {
                var wildcardImports = scope.wildcardImports || (scope.wildcardImports = []);
                wildcardImports.push(modulePath);
            }
        }
        
        return context.scope;
    }
}
