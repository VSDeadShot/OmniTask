import sys
from PIL import Image

def process_image(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        r, g, b, a = item
        # Use max(R,G,B) as the alpha channel to make black transparent
        # and keep the colors bright.
        alpha = max(r, g, b)
        
        if alpha == 0:
            newData.append((0, 0, 0, 0))
        else:
            # Normalize the color based on the alpha
            # If a pixel was (127, 0, 127), alpha is 127
            # We want it to be (255, 0, 255) with alpha 127.
            # This perfectly preserves the glowing anti-aliased edges without a black halo!
            nr = int(r * 255 / alpha)
            ng = int(g * 255 / alpha)
            nb = int(b * 255 / alpha)
            newData.append((nr, ng, nb, alpha))

    img.putdata(newData)
    img.save(output_path, "PNG")

process_image('C:\\Users\\vedan\\.gemini\\antigravity-cli\\brain\\5de827b0-b9fa-47bf-a7f9-8e58b3642c90\\omnitask_gradient_icon_1781696917369.jpg', 'C:\\Users\\vedan\\OneDrive\\Desktop\\VSDeadShot\\Projects\\ToDoApp\\src\\assets\\icon.png')
process_image('C:\\Users\\vedan\\.gemini\\antigravity-cli\\brain\\5de827b0-b9fa-47bf-a7f9-8e58b3642c90\\omnitask_gradient_icon_1781696917369.jpg', 'C:\\Users\\vedan\\OneDrive\\Desktop\\VSDeadShot\\Projects\\ToDoApp\\public\\icon.png')
process_image('C:\\Users\\vedan\\.gemini\\antigravity-cli\\brain\\5de827b0-b9fa-47bf-a7f9-8e58b3642c90\\omnitask_gradient_icon_1781696917369.jpg', 'C:\\Users\\vedan\\OneDrive\\Desktop\\VSDeadShot\\Projects\\ToDoApp\\build\\icon.png')
print("Successfully created transparent images!")
