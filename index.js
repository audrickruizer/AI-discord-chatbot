require('dotenv/config');
const { Client } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

client.on('ready', () => {
  console.log('The bot is online.');
});

const IGNORE_PREFIX = "!";
const CHANNELS = ['1272458681308680224'];

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(IGNORE_PREFIX)) return;
  if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping();

  const sendTypingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 500);

  let conversation = [];
  conversation.push({
      role: 'system',
      content: 'Chat GPT is a friendly chatbot.',
  });

  let prevMessages = await message.channel.messages.fetch({ limit: 10 });
  prevMessages.reverse();

  prevMessages.forEach((msg) => {
    if (msg.author.bot && msg.author.id !== client.user.id) return;
    if (msg.content.startsWith(IGNORE_PREFIX)) return;

    const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

    if (msg.author.id === client.user.id) {
      conversation.push({
        role: 'assistant',
        name: username,
        content: msg.content,
      });

      return;
    }

    conversation.push({
      role: 'user',
      name: username,
      content: msg.content,
    });
  });

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'mistralai/mistral-7b-instruct',
      messages: conversation,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    clearInterval(sendTypingInterval); // Make sure to clear the interval here.

    if (!response.data || !response.data.choices || !response.data.choices[0].message.content) {
      message.reply("I'm having some trouble. Try again in a moment.");
      return;
    }

    const responseMessage = response.data.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
      const chunk = responseMessage.substring(i, i + chunkSizeLimit);
      await message.reply(chunk);
    }
  } catch (error) {
    console.error('Error with OpenRouter API:', error);
    clearInterval(sendTypingInterval); // Clear the interval in case of error.
    message.reply("Something went wrong while talking to the AI.");
  }
});

client.login(process.env.TOKEN);
