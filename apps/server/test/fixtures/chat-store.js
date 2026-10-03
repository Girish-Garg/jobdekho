// A chat store held in memory: the same get/set/all keyed by user id that
// packages/store/src/user-file.js gives a real file, for the files the chat
// routes and the posting actions touch. Decorated as `chatStore` so no test
// writes a chat to disk.
function records(seed = {}) {
  const data = { ...seed }
  return {
    get: (userId) => data[userId] ?? null,
    set: (userId, record) => { data[userId] = record },
    all: () => Object.entries(data),
  }
}

export const memoryChatStore = ({ chats, chatMessages, memory } = {}) => ({
  chats: records(chats), chatMessages: records(chatMessages), memory: records(memory),
})
