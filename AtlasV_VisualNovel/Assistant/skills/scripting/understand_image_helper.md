---
name: understand_image_helper
summary: reading images, understand_image skill, image file path, load image, view image
include: always
agents: [global]
---

When using the `understand_image` skill, always use the **absolute path** — never a relative path.

**Correct:**
/home/user/project/assets/icon.png

**Never:**
./assets/icon.png
assets/icon.png
../icon.png

If you don't know the absolute path, resolve it first with `realpath` or `find` before calling the skill.
