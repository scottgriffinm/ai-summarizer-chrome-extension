// content.js

function showPopup(html, isError = false) {
  const ID = "summarize-with-ai-popup";
  let popup = document.getElementById(ID);
  if (popup) popup.remove();

  popup = document.createElement("div");
  popup.id = ID;
  popup.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    max-width: 300px;
    background: ${isError ? "#ffe6e6" : "#ffffff"};
    color: #000;
    border: 1px solid ${isError ? "#ff4d4d" : "#ccc"};
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    z-index: 100000;
    font-family: sans-serif;
  `;

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    float: right;
    cursor: pointer;
    font-weight: bold;
  `;
  closeBtn.addEventListener("click", () => popup.remove());
  popup.appendChild(closeBtn);

  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = html;
  popup.appendChild(contentDiv);

  document.body.appendChild(popup);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "showSummary") {
    showPopup(msg.summary);
  } else if (msg.type === "showError") {
    showPopup(msg.error, true);
  }
});