class NumberInput {
  constructor({ parent, label = "", value = 0, step = 1, min = -Infinity, max = Infinity, onChange = () => {} } = {}) {
    this.box = new Box({ parent }).el;

    if (label) {
      this.label = document.createElement("div");
      this.label.textContent = label;
      this.label.style.marginBottom = "4px";
      this.box.appendChild(this.label);
    }

    this.input = document.createElement("input");
    this.input.type = "number";
    Object.assign(this.input, { value, step, min, max });
    Object.assign(this.input.style, { width: "100%", padding: "4px", background: "#0f172a", color: "white", border: "1px solid #334155", borderRadius: "4px" });

    this.onChange = onChange;
    this.input.oninput = () => this.onChange(this.value);

    this.box.appendChild(this.input);
  }

  get value() {
    return parseFloat(this.input.value) || 0;
  }

  setValue(val, silent = false) {
    this.input.value = val;
    if (!silent) this.onChange(this.value);
  }
}

