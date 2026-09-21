import { XCC_SHADER_CONTROLS, type XccShaderSettings } from './shader_settings';

export function mountCedalionShaderPanel(
  panel: HTMLElement,
  initialSettings: XccShaderSettings,
  onChange: (settings: XccShaderSettings) => void,
): void {
  const baseline = { ...initialSettings };
  const liveSettings = { ...initialSettings };
  const fieldResets: Array<() => void> = [];

  const heading = document.createElement('h2');
  heading.textContent = 'Cedalion — temporary shader controls';

  const description = document.createElement('p');
  description.textContent = 'Live state (read-only; copy manually):';

  const stateBox = document.createElement('textarea');
  stateBox.className = 'cedalion-state';
  stateBox.readOnly = true;
  stateBox.setAttribute('aria-label', 'Complete Cedalion live state JSON');

  const resetAll = document.createElement('button');
  resetAll.className = 'cedalion-reset-all';
  resetAll.type = 'button';
  resetAll.textContent = 'Reset entire panel';

  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'cedalion-controls';
  const groups = new Map<string, HTMLDivElement>();

  function updateState(): void {
    stateBox.value = JSON.stringify(liveSettings, null, 2);
  }

  function applySettings(): void {
    updateState();
    onChange({ ...liveSettings });
  }

  function groupContainer(groupName: string): HTMLDivElement {
    const existing = groups.get(groupName);
    if (existing) return existing;

    const group = document.createElement('section');
    group.className = 'cedalion-group';
    const groupHeading = document.createElement('h3');
    groupHeading.textContent = groupName;
    const fields = document.createElement('div');
    fields.className = 'cedalion-group-fields';
    group.append(groupHeading, fields);
    controlsContainer.append(group);
    groups.set(groupName, fields);
    return fields;
  }

  XCC_SHADER_CONTROLS.forEach((control, index) => {
    const field = document.createElement('div');
    field.className = 'cedalion-field';

    const label = document.createElement('label');
    const inputId = `cedalion-shader-${index}`;
    label.htmlFor = inputId;
    label.textContent = `${control.label} (${control.name})`;

    const range = document.createElement('input');
    range.id = inputId;
    range.type = 'range';
    range.min = String(control.min);
    range.max = String(control.max);
    range.step = String(control.step);

    const exact = document.createElement('input');
    exact.type = 'number';
    exact.min = String(control.min);
    exact.max = String(control.max);
    exact.step = String(control.step);
    exact.setAttribute('aria-label', `${control.label} exact value`);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset';
    reset.setAttribute('aria-label', `Reset ${control.label}`);

    const setValue = (value: number): void => {
      if (!Number.isFinite(value)) return;
      liveSettings[control.name] = value;
      range.value = String(value);
      exact.value = String(value);
      applySettings();
    };

    range.addEventListener('input', () => setValue(range.valueAsNumber));
    exact.addEventListener('input', () => {
      if (exact.validity.valid) {
        liveSettings[control.name] = exact.valueAsNumber;
        range.value = exact.value;
        applySettings();
      }
    });
    exact.addEventListener('change', () => {
      if (!exact.validity.valid) exact.value = range.value;
    });

    const resetField = (): void => setValue(baseline[control.name]);
    reset.addEventListener('click', resetField);
    fieldResets.push(resetField);

    range.value = String(liveSettings[control.name]);
    exact.value = String(liveSettings[control.name]);
    field.append(label, range, exact, reset);
    groupContainer(control.group).append(field);
  });

  resetAll.addEventListener('click', () => {
    if (!window.confirm('Reset every Shader2 Cedalion setting to its original value?')) {
      return;
    }
    for (const resetField of fieldResets) resetField();
  });

  panel.replaceChildren(heading, description, stateBox, resetAll, controlsContainer);
  updateState();
}
