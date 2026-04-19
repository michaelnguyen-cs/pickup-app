// Mock chat data — utility group chats only
// These are tied to venues/runs, NOT to users
// Supabase: realtime subscriptions via supabase.channel('chat:' + roomId)

import { ChatRoom, ChatMessage } from './types';

export const MOCK_CHAT_ROOMS: ChatRoom[] = [
  {
    id: 'chat-v1',
    venueId: 'v1',
    label: 'Rucker Park Chat',
    memberCount: 14,
    lastMessage: 'Anyone getting there early tonight?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 min ago
  },
  {
    id: 'chat-r2',
    venueId: 'v2',
    label: 'UCLA Open Gym Chat',
    memberCount: 22,
    lastMessage: 'Full court is open until 9, come through',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'chat-r4',
    venueId: 'v5',
    label: 'Venice Beach Volleyball',
    memberCount: 8,
    lastMessage: 'Weather looks perfect Saturday',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'chat-r5',
    venueId: 'v3',
    label: 'Lincoln Park Run Group',
    memberCount: 11,
    lastMessage: 'Cold morning but we\'re still running — dress warm!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'chat-v1': [
    {
      id: 'm1',
      roomId: 'chat-v1',
      senderId: 'user_mock_1',
      senderName: 'Marcus',
      text: 'Who\'s out there tonight?',
      sentAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'm2',
      roomId: 'chat-v1',
      senderId: 'user_mock_2',
      senderName: 'Dre',
      text: 'Coming through around 6:30',
      sentAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'm3',
      roomId: 'chat-v1',
      senderId: 'user_mock_3',
      senderName: 'Tiana',
      text: 'Anyone getting there early tonight?',
      sentAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
  ],
  'chat-r2': [
    {
      id: 'm4',
      roomId: 'chat-r2',
      senderId: 'user_mock_4',
      senderName: 'Jordan',
      text: 'Gym is packed rn, like 40 people',
      sentAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    {
      id: 'm5',
      roomId: 'chat-r2',
      senderId: 'user_mock_5',
      senderName: 'Alexis',
      text: 'Full court is open until 9, come through',
      sentAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
  ],
};
