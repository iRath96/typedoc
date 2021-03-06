import {Reflection, ReflectionKind, ProjectReflection, DeclarationReflection,ContainerReflection} from "../../models/reflections/index";
import {Component, RendererComponent} from "../components";
import {PageEvent} from "../events";
import {NavigationItem} from "../models/NavigationItem";


/**
 * A plugin that generates a table of contents for the current page.
 *
 * The table of contents will start at the nearest module or dynamic module. This plugin
 * sets the [[PageEvent.toc]] property.
 */
@Component({name:"toc"})
export class TocPlugin extends RendererComponent
{
    /**
     * Create a new TocPlugin instance.
     */
    initialize() {
        this.listenTo(this.owner, {
            [PageEvent.BEGIN]: this.onRendererBeginPage
        });
    }


    /**
     * Triggered before a document will be rendered.
     *
     * @param page  An event object describing the current render operation.
     */
    private onRendererBeginPage(page:PageEvent) {
        var model = page.model;
        if (!(model instanceof Reflection)) {
            return;
        }

        var trail:Reflection[] = [];
        while (!(model instanceof ProjectReflection) && !model.kindOf(ReflectionKind.SomeModule)) {
            trail.unshift(model);
            model = model.parent;
        }

        page.toc = new NavigationItem();
        TocPlugin.buildToc(model, trail, page.toc);
    }


    /**
     * Create a toc navigation item structure.
     *
     * @param model   The models whose children should be written to the toc.
     * @param trail   Defines the active trail of expanded toc entries.
     * @param parent  The parent [[NavigationItem]] the toc should be appended to.
     */
    static buildToc(model:Reflection, trail:Reflection[], parent:NavigationItem) {
        var index = trail.indexOf(model);
        var children = [];
        if(model instanceof ContainerReflection)
            children = model.getChildrenAndReExports();

        if (index < trail.length - 1 && children.length > 40) {
            var child = trail[index + 1];
            var item = NavigationItem.create(child, parent, true);
            item.isInPath  = true;
            item.isCurrent = false;
            TocPlugin.buildToc(child, trail, item);
        } else {
            children.forEach((child:DeclarationReflection) => {
                if (child.kindOf(ReflectionKind.SomeModule)) {
                    return;
                }

                var item = NavigationItem.create(child, parent, true);
                if (trail.indexOf(child) != -1) {
                    item.isInPath  = true;
                    item.isCurrent = (trail[trail.length - 1] == child);
                    TocPlugin.buildToc(child, trail, item);
                }
            });
        }
    }
}
