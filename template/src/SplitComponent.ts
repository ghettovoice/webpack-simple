import { Component, Prop } from "vue-typed";

@Component({
    template: require('./split-component.html')
})
export default class SplitComponent {
    @Prop()
    prop: string = 'Prop1';
}
