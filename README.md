# Avatar Cropper
Simple and accurate avatar cropping tool that runs in your browser. Made with extremely paranoid people in mind. You'll never miss a single pixel ever again!

**Use it here:** [https://leadrdrk.eu.org/avatarcropper](https://leadrdrk.eu.org/avatarcropper)

![worthless promotional image](assets/ac_card.png)

# Features
- Works great on both mobile and desktop.
- Progressive Web App support.
- GIF support: Can crop a specific GIF frame or export as animated GIF.

# Development
This project uses Parcel as its build tool. Simply run `npm run start` to start the development server. If this is your first time, run `npm install` first to install the dependencies.

However, since this project uses nothing but plain old web technologies, you could use anything else to serve the `src` folder.

# Build
Use `npm run build` to build the project. *This is not required as mentioned above.*

# Translations
The following languages are available for the project:
- English (natively supported)
- Vietnamese (natively supported)

Don't see your language on the list? You can help by adding it yourself!
<details>
<summary>How to add a language</summary>

- Before continuing, check the i18n folder first to see if your language is already being worked on.
- If a translation does not exist for your language yet:
    1. Fork the repo.
    2. Create a new branch for your translation.
    3. Go to the `i18n` folder.
    4. Copy the `vi-vn.json` file and rename it accordingly.
        - The name must be a ISO 639-1 code with country (if needed)
        - e.g. `en-us` is for English (United States)
    5. Translate all the strings in your newly created file.
    6. Add your language to `langs.json`
    7. Add your language to the README, in the Translations section.
        - Format: `- Language (added by [@username](https://github.com/username))`
    8. Commit your changes and create a pull request.
- If you didn't understand a single thing above: Create a new issue with your translation file and I'll do it for you!
- You should also update your translation whenever new strings are added.
    - Occasionally check the `vi-vn.json` file for changes if possible.
</details>

# License
Licensed under [GNU AGPLv3](LICENSE)

External project licenses:
- [omggif](https://github.com/deanm/omggif): MIT License