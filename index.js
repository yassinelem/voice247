require("dotenv").config();

const { Client, Constants } = require("discord.js-selfbot-v13");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID;
const RECONNECT_DELAY = 5000;
const TRIGGER_REGEX = /\bbla\s+smia\b/i;
const TRIGGER_REPLY = "9e7bat ban";

if (!TOKEN || !CHANNEL_ID) {
  console.error("Il manque TOKEN ou CHANNEL_ID dans le .env");
  process.exit(1);
}

const client = new Client({ checkUpdate: false });

let joining = false;
let reconnectTimer = null;
const boundConnections = new WeakSet();

function resolveChannel() {
  return (
    client.channels.cache.get(CHANNEL_ID) ||
    client.channels.resolve(CHANNEL_ID) ||
    (GUILD_ID && client.guilds.cache.get(GUILD_ID)?.channels.cache.get(CHANNEL_ID))
  );
}

function scheduleReconnect(delay = RECONNECT_DELAY) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    join();
  }, delay);
}

function bind(connection) {
  if (boundConnections.has(connection)) return;
  boundConnections.add(connection);

  connection.on("disconnect", () => {
    console.log("Déconnecté du salon vocal.");
    scheduleReconnect();
  });

  connection.on("failed", (reason) => {
    console.error("Connexion vocale échouée :", reason?.message ?? reason);
    scheduleReconnect();
  });

  connection.on("error", (err) => {
    console.error("Erreur vocale :", err?.message ?? err);
  });
}

async function join() {
  if (joining) return;
  joining = true;

  try {
    const channel = resolveChannel();
    if (!channel) {
      throw new Error("Salon vocal introuvable (vérifie CHANNEL_ID)");
    }

    if (!channel.joinable) {
      throw new Error("Le compte ne peut pas rejoindre ce salon");
    }

    const connection = await client.voice.joinChannel(channel, {
      selfMute: true,
      selfDeaf: true,
      selfVideo: false,
    });

    bind(connection);
    console.log(`Connecté au salon vocal : ${channel.name ?? channel.id}`);
    joining = false;
  } catch (err) {
    console.error("Impossible de rejoindre le salon :", err?.message ?? err);
    joining = false;
    scheduleReconnect();
  }
}

// Filet de sécurité : vérifie régulièrement que le compte est toujours dans le salon
setInterval(() => {
  if (!client.user) return;

  const connection = client.voice.connection;
  const status = connection?.status;

  if (!connection || status === Constants.VoiceStatus.DISCONNECTED) {
    console.log("Connexion vocale perdue, reconnexion...");
    join();
  } else if (connection.channel?.id !== CHANNEL_ID) {
    console.log("Compte dans un autre salon, retour...");
    join();
  }
}, 60000);

client.once("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  join();
});

// Si le compte est déplacé, déconnecté ou expulsé du salon, il revient
client.on("voiceStateUpdate", (oldState, newState) => {
  if (newState.id !== client.user?.id) return;
  if (newState.channelId !== CHANNEL_ID) {
    console.log("Retiré du salon, reconnexion...");
    scheduleReconnect(3000);
  }
});

// Répond "9e7bat ban" quand quelqu'un écrit "bla smia"
client.on("messageCreate", async (message) => {
  try {
    if (!message?.guild) return;
    if (!message.author || message.author.id === client.user?.id) return;
    if (message.author.bot) return;

    const targetGuildId =
      GUILD_ID || client.channels.cache.get(CHANNEL_ID)?.guildId;
    if (targetGuildId && message.guild.id !== targetGuildId) return;

    if (!TRIGGER_REGEX.test(message.content ?? "")) return;

    await message.reply(TRIGGER_REPLY);
    console.log(`Réponse envoyée à ${message.author.tag} dans #${message.channel.name ?? message.channel.id}`);
  } catch (err) {
    console.error("Erreur lors de la réponse :", err?.message ?? err);
  }
});

client.on("error", (err) => console.error("Erreur client :", err?.message ?? err));
client.on("shardDisconnect", () => console.log("Connexion Discord perdue..."));

process.on("unhandledRejection", (err) => console.error("Erreur :", err));

client.login(TOKEN).catch((err) => {
  console.error("Connexion impossible :", err?.message ?? err);
  process.exit(1);
});
