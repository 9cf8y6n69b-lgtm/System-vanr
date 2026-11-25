
const fs = require("fs");
const path = require("path");

// يرجع كل ملفات .js داخل مجلد (بدون الاعتماد على حزمة glob)
function listJs(dir, deep = true) {
    const out = [];

    if (!fs.existsSync(dir)) return out;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (deep) out.push(...listJs(full, true));
        } else if (entry.name.endsWith(".js")) {
            out.push(full);
        }
    }

    return out.sort();
}

module.exports = async (client) => {
    if (!client.commands) client.commands = new Map();
    if (!client.slashCommands) client.slashCommands = new Map();

    const commandFiles = listJs(path.join(process.cwd(), "Commands"));

    const arrayOfslashCommands = [];

    for (const value of commandFiles) {
        try {
            const file = require(value);

            // ملفات الأحداث التي تحتاج client
            if (typeof file === "function") {
                file(client);
                continue;
            }

            if (file.name) {
                const relativePath = path.relative(
                    path.join(process.cwd(), "Commands"),
                    value
                );

                const splitted = relativePath.split(path.sep);
                const directory = splitted.length > 1 ? splitted[0] : "General";

                const properties = { directory, ...file };

                client.commands.set(file.name, properties);

                // السلاش: الاسم لازم إنجليزي صغير بدون مسافات (غير كذا ديسكورد يرفض كل القائمة)
                // مثال أمر "سجن" كان يكسر تسجيل كل أوامر السلاش
                if (file.description) {
                    if (/^[a-z0-9_-]{1,32}$/.test(file.name) && arrayOfslashCommands.length < 100) {
                        arrayOfslashCommands.push({
                            name: file.name,
                            description: String(file.description).slice(0, 100),
                            options: file.options || []
                        });
                        client.slashCommands.set(file.name, file);
                    }
                }
            }
        } catch (error) {
            console.error(`[HANDLER] Failed loading ${value}:`, error);
        }
    }

    console.log(
        `[HANDLER] Loaded ${client.commands.size} commands successfully.`
    );

    const eventFiles = listJs(path.join(process.cwd(), "events"), false);

    for (const value of eventFiles) {
        try {
            require(value);
        } catch (error) {
            console.error(`[HANDLER] Failed loading event ${value}:`, error);
        }
    }

    console.log(
        `[HANDLER] Loaded ${eventFiles.length} event files successfully.`
    );

    client.on("ready", async () => {
        console.log(`[HANDLER] Logged in as ${client.user.tag}!`);

        for (const guild of client.guilds.cache.values()) {
            try {
                if (arrayOfslashCommands.length > 0) {
                    await guild.commands.set(arrayOfslashCommands);
                    console.log(
                        `[HANDLER] Registered slash commands in ${guild.name}`
                    );
                }
            } catch (error) {
                console.error(
                    `[HANDLER] Failed registering commands in ${guild.name}:`,
                    error
                );
            }
        }
    });
};
