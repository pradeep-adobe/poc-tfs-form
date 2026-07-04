import { moveInstrumentation } from '../../scripts/scripts.js';

function cellText(cell) {
  return cell ? cell.textContent.trim() : '';
}

function slugify(value, fallback) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function parseOptions(raw) {
  return String(raw || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildControl(field) {
  const {
    type, name, placeholder, required, options,
  } = field;

  if (type === 'textarea') {
    const el = document.createElement('textarea');
    el.name = name;
    el.rows = 4;
    if (placeholder) el.placeholder = placeholder;
    if (required) el.required = true;
    return el;
  }

  if (type === 'select') {
    const el = document.createElement('select');
    el.name = name;
    if (required) el.required = true;
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder || 'Select…';
    el.append(empty);
    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      el.append(option);
    });
    return el;
  }

  if (type === 'radio') {
    const group = document.createElement('div');
    group.className = 'form-radio-group';
    options.forEach((opt, index) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'form-radio';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = opt;
      if (required && index === 0) input.required = true;
      const span = document.createElement('span');
      span.textContent = opt;
      wrapper.append(input, span);
      group.append(wrapper);
    });
    return group;
  }

  if (type === 'checkbox') {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.name = name;
    if (required) el.required = true;
    return el;
  }

  const el = document.createElement('input');
  el.type = type;
  el.name = name;
  if (placeholder) el.placeholder = placeholder;
  if (required) el.required = true;
  return el;
}

export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'form-el';
  form.noValidate = false;

  const status = document.createElement('p');
  status.className = 'form-status';
  status.hidden = true;

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const type = (cellText(cells[0]) || 'text').toLowerCase();
    const label = cellText(cells[1]);
    const required = /^(true|yes|on|x|1|checked)$/i.test(cellText(cells[2]));
    const options = parseOptions(cellText(cells[3]));
    const name = slugify(label, `field-${Math.random().toString(36).slice(2, 8)}`);
    const placeholder = label;

    const field = {
      type, label, name, placeholder, required, options,
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    moveInstrumentation(row, wrapper);

    if (type === 'submit') {
      const button = document.createElement('button');
      button.type = 'submit';
      button.className = 'form-submit';
      button.textContent = label || 'Submit';
      wrapper.append(button);
      form.append(wrapper);
      return;
    }

    const control = buildControl(field);

    if (type === 'checkbox') {
      const inlineLabel = document.createElement('label');
      inlineLabel.className = 'form-checkbox';
      const span = document.createElement('span');
      span.textContent = label + (required ? ' *' : '');
      inlineLabel.append(control, span);
      wrapper.append(inlineLabel);
    } else {
      const fieldLabel = document.createElement('label');
      fieldLabel.className = 'form-field-label';
      fieldLabel.textContent = label + (required ? ' *' : '');
      wrapper.append(fieldLabel, control);
    }

    form.append(wrapper);
  });

  // Ensure there is always a submit control.
  if (!form.querySelector('button[type="submit"]')) {
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'form-submit';
    submit.textContent = 'Submit';
    form.append(submit);
  }

  form.append(status);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    status.hidden = false;
    status.textContent = 'Thank you! Your response was recorded.';
    // eslint-disable-next-line no-console
    console.log('Form submission', data);
  });

  block.replaceChildren(form);
}
