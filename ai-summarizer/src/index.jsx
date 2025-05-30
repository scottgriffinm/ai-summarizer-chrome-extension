import React from 'react';
import { createRoot } from 'react-dom/client';
import AIChatInterface from './AIChatInterface';
import './index.css';

const container = document.createElement('div');
container.id = 'react-ai-chat-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<AIChatInterface />);