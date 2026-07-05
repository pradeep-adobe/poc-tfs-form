import { loadScript } from '../../scripts/aem.js';
import { TFS_FORM_APP } from './form-config.js';

/**
 * Reads formConfig from the UE-instrumented cell (must stay in the DOM).
 * @param {Element} block
 * @returns {{title: string, submitLabel: string, fields: Array}}
 */
export function readConfig(block) {
  const cell = block.querySelector('[data-aue-prop="formConfig"]')
    || block.querySelector(':scope > div > div');
  const raw = (cell?.textContent || '').trim();
  if (!raw) return { title: '', submitLabel: 'Submit', fields: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title || '',
      submitLabel: parsed.submitLabel || 'Submit',
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[form] formConfig is not valid JSON', error);
    return { title: '', submitLabel: 'Submit', fields: [] };
  }
}

function findConfigCell(block) {
  return block.querySelector('[data-aue-prop="formConfig"]')
    || block.querySelector(':scope > div > div');
}

let appPromise;
function loadFormApp() {
  if (!appPromise) {
    appPromise = loadScript(TFS_FORM_APP.scriptUrl).then(() => {
      if (!window.TFSForm?.render) {
        throw new Error('TFSForm global not available after loading bundle');
      }
    });
  }
  return appPromise;
}

/**
 * Re-render the React microfrontend for a form block (used during UE live preview).
 * @param {Element} block
 * @param {object|string} specOrJson
 */
export async function renderFormBlock(block, specOrJson) {
  const spec = typeof specOrJson === 'string'
    ? JSON.parse(specOrJson)
    : specOrJson;

  let mount = block.querySelector(':scope > .tfs-form-app');
  if (!mount) {
    mount = document.createElement('div');
    mount.className = 'tfs-form-app';
    block.appendChild(mount);
  }

  await loadFormApp();
  window.TFSForm.render(mount, spec);
}

/**
 * Handle aue:content-patch events for formConfig updates from the extension.
 * @param {CustomEvent} event
 * @returns {Promise<boolean>}
 */
export async function applyFormConfigPatch(event) {
  const { detail } = event;
  const patches = detail?.request?.patch || detail?.request?.operations || [];
  const formPatch = patches.find((p) => /formConfig/i.test(p.path || ''));
  if (!formPatch) return false;

  const value = typeof formPatch.value === 'string'
    ? formPatch.value
    : JSON.stringify(formPatch.value);

  const resource = detail?.request?.target?.resource
    || detail?.request?.target?.editable?.resource;
  if (!resource) return false;

  const block = document.querySelector(`.form.block[data-aue-resource="${resource}"]`)
    || document.querySelector(`[data-aue-resource="${resource}"]`)?.closest('.form.block');
  if (!block) return false;

  const cell = findConfigCell(block);
  if (cell) cell.textContent = value;

  try {
    await renderFormBlock(block, value);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[form] live preview update failed', error);
    return false;
  }
}

/**
 * loads and decorates the form block by mounting the TFS React microfrontend
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const spec = readConfig(block);

  let mount = block.querySelector(':scope > .tfs-form-app');
  if (!mount) {
    mount = document.createElement('div');
    mount.className = 'tfs-form-app';
    // Keep the UE-instrumented formConfig cell — only append the React mount.
    block.appendChild(mount);
  }

  try {
    await renderFormBlock(block, spec);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[form] failed to load TFS form microfrontend', error);
    mount.innerHTML = `<p class="tfs-form-error">Unable to load the form application from
      <code>${TFS_FORM_APP.scriptUrl}</code>. Start the tfs-form-app dev server
      (<code>npm run dev</code>) and trust its certificate.</p>`;
  }
}
