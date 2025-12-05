const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

const API_URL = 'http://localhost:3000/api/chat';

// Fungsi untuk format error message
function formatErrorMessage(errorCode, errorMessage) {
  // Jika error sudah user-friendly dari backend, gunakan langsung
  if (errorCode === 'QUOTA_EXCEEDED' || 
      errorCode === 'API_KEY_INVALID' || 
      errorCode === 'CONTENT_BLOCKED' || 
      errorCode === 'TIMEOUT' || 
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'MODEL_NOT_FOUND') {
    return errorMessage;
  }
  
  // Untuk error yang tidak diketahui, format dengan error code
  return `Error 404 - ${errorMessage}`;
}

// Fungsi untuk parse markdown syntax
function parseMarkdown(text) {
  // Escape HTML untuk security
  let html = text;
  
  // Parse bold/heading: **text** → <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Parse italic: *text* → <em>text</em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Parse line breaks: \n → <br>
  html = html.replace(/\n/g, '<br>');
  
  // Parse numbered lists: 1. item → <li>item</li>
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
  
  // Parse bullet lists: - item atau * item → <li>item</li>
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
  
  return html;
}

// Fungsi untuk mengirim pesan ke Gemini API
async function sendMessageToGemini(message) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message }),
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message,
      errorCode: 'NETWORK_ERROR'
    };
  }
}

// Event listener untuk form submission
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Tampilkan pesan user
  appendMessage('user', userMessage);
  input.value = '';

  // Tampilkan indikator loading
  appendMessage('bot', 'Gemini sedang berfikir...');

  // Kirim pesan ke API dan tunggu response
  const response = await sendMessageToGemini(userMessage);

  // Hapus pesan loading
  const lastMessage = chatBox.lastChild;
  if (lastMessage && lastMessage.textContent.includes('Gemini sedang berfikir')) {
    lastMessage.remove();
  }

  // Tampilkan response atau error
  if (response.success) {
    appendMessage('bot', response.reply, true); // true untuk parse markdown
  } else {
    const errorMessage = formatErrorMessage(response.errorCode, response.error);
    appendMessage('bot', errorMessage);
  }
});

function appendMessage(sender, text, isMarkdown = false) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('message', sender);
  
  const messageBubble = document.createElement('div');
  
  if (isMarkdown) {
    // Parse markdown dan set sebagai HTML
    messageBubble.innerHTML = parseMarkdown(text);
  } else {
    // Set sebagai plain text
    messageBubble.textContent = text;
  }
  
  messageContainer.appendChild(messageBubble);
  chatBox.appendChild(messageContainer);
  chatBox.scrollTop = chatBox.scrollHeight;
}
