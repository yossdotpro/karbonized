# 🔌 Plugins

> ⚠️ This Functionality is Under Development

## Installing Plugins

To install new Plugins copy the extension file *(.kext)* in the **Karbonized** folder in dependency of your operating system:

* **Windows**: C:\Users\USER\AppData\Local\karbonized\extensions\
* **Linux**: /home/USER/.config/karbonized/extensions/
* **Mac**: /Users/USER/Library/Application Support/karbonized/extensions/

## Creating new Plugins

To create Plugins you only need to have a minimum knowledge of **Javascript** and **JSX**. So anyone can write new Plugins for **Kabonized**

### First, take a look at its Structure

``` plain
my-plugin
    components
        - component1.jsx
        - component1.json
        - component1.png
    info.json
```

All the components you create must be in the **components** folder, no other name is allowed and the structure must be kept like this.

The **info.json** stores the information of your new plugin its structure is as follow:

``` json
{
    "name":"My New Plugin",
    "author":"@yossdotpro",
    "description": "An Awesome Description",
    "version":"1.0.0"
}

```

### Creating New Components

Start by creating a new .jsx files in the components folder and copy this structure, *all the component you create must have the same structure*, you can use everything you know about react, except Hooks, later we will see all the limitations.

component1.jsx

``` jsx
const Component = () => {
 return <p>This is Awesome</p>;
};

render(<Component />);

```

component1.json

``` json
{ "name" : "component1"}
```

We also need to create a **JSON** file with the same name of the component which will include the properties that Karbonized needs to interact with it(for now only need the name of that component) and the image  that will represent the component in the extensions section of **Karbonized**

### Packaging

See [icon-pack-plugin-template](https://github.com/karbon-apps/icon-pack-extension-template)

### Limitations

This function is still in **early development phase** and therefore contains some limitations when creating new Plugins:

* External Libraries cannot be used
* Component names must not contain "-"
* The images representing the components can be .png or .svg
