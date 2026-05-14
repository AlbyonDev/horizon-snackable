---
name: xaml_image_binding
summary: Noesis XAML image binding, Custom UI dynamic images, TextureAsset binding, xaml UI image source, NoesisGUI image data binding
include: always
agents: [global]
---

## Dynamic Image Binding in Noesis XAML (Custom UI)

When binding an image dynamically in Noesis XAML, you must expose a `TextureAsset` 
from your TypeScript ViewModel — NOT a string path. Noesis does not support 
`{Binding}` markup extensions on `Image.Source`.

**TypeScript ViewModel (expose a TextureAsset, not a string):**

```xml
<Image>
    <Image.Source>
        <Binding Path="view_model_textureasset_variable"/>
    </Image.Source>
</Image>
```


do NOT use : 

```xml
<Image Source="{Binding string_variable}" />
```
