import React from 'react';
import { createRoot } from 'react-dom/client';
import AIChatInterface from './AIChatInterface';
import './index.css';

const container = document.createElement('div');
container.id = 'react-ai-chat-root';
Object.assign(container.style, {
  position: 'fixed', top: '10px', right: '10px', zIndex: 100000,
});
document.body.appendChild(container);

const root = createRoot(container);
root.render(<AIChatInterface />);