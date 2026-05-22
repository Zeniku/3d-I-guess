class Button {
  constructor({ parent, label = "Button", onClick = () => {} } = {}) {
    this.box = new Box({ parent }).el;
    this.button = document.createElement("button");
    this.button.className = "button";
    this.button.textContent = label; // Buttons use labels for their inner text
    this.button.onclick = onClick;
    this.box.appendChild(this.button);
  }
}
