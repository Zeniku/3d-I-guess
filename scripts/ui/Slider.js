class Slider {
  constructor({ parent, label = "", min = 0, max = 1, step = 0.01, value = 1, onChange = () => {} } = {}) {
    this.box = new Box({ parent }).el;
    this.container = document.createElement("div");
    Object.assign(this.container.style, { display: "flex", gap: "0.5em", alignItems: "center" });

    // "label" is strictly the text identifying this specific input
    if (label) {
      this.label = document.createElement("div");
      this.label.textContent = label;
      this.label.style.whiteSpace = "nowrap";
      this.container.appendChild(this.label);
    }

    this.input = document.createElement("input");
    this.input.type = "range";
    this.input.min = min;
    this.input.max = max;
    this.input.step = step;
    this.input.value = value;
    Object.assign(this.input.style, { flex: "1", minWidth: "0" });

    this.onChange = onChange;
    
    // Trigger callback when user interacts
    this.input.oninput = () => this.onChange(this.value);

    this.container.appendChild(this.input);
    this.box.appendChild(this.container);
  }

  get value() {
    return parseFloat(this.input.value);
  }

  // Use silent = true when updating FROM the game loop to avoid feedback loops
  setValue(val, silent = false) {
    this.input.value = val;
    if (!silent) this.onChange(this.value);
  }
}

