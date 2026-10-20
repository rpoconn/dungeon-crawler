import Phaser from 'phaser';
import { login, register } from '../api/auth';
import { ApiError } from '../api/client';
import { loadSave } from '../api/saves';
import { clearSession, getSession } from '../api/session';
import { SCENES } from '../config';
import { newSave } from '../logic/save';
import type { GameSceneData } from './GameScene';
import './AuthScene.css';

type Mode = 'login' | 'register';

const SUBMIT_LABEL: Record<Mode, string> = {
  login: 'Enter the dungeon',
  register: 'Create account',
};

const FORM_HTML = `
  <form class="auth-panel">
    <h1>Dungeon Crawler</h1>
    <p class="auth-tagline">Ten floors down. One way out.</p>
    <div class="auth-tabs">
      <button type="button" data-mode="login">Log in</button>
      <button type="button" data-mode="register">Create account</button>
    </div>
    <fieldset>
      <label>Username
        <input name="username" autocomplete="username" required minlength="3" maxlength="32"
          pattern="[\\w\\-]+" title="3–32 letters, numbers, _ or -" />
      </label>
      <label>Password
        <input name="password" type="password" required minlength="6" maxlength="128" />
      </label>
      <p class="auth-error" role="alert"></p>
      <button type="submit" class="auth-submit"></button>
    </fieldset>
  </form>`;

function find<T extends Element = Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`AuthScene markup is missing ${selector}`);
  return el;
}

/** HTML form overlay for login / account creation. On success, loads the save and starts the game. */
export class AuthScene extends Phaser.Scene {
  private overlay!: HTMLDivElement;
  private form!: HTMLFormElement;

  constructor() {
    super(SCENES.auth);
  }

  create(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'auth-overlay';
    this.overlay.innerHTML = FORM_HTML;
    // Phaser listens for keys on window; keep typing in the form from reaching it.
    this.overlay.addEventListener('keydown', (e) => e.stopPropagation());
    document.body.append(this.overlay);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.overlay.remove());

    this.form = find<HTMLFormElement>(this.overlay, 'form');
    for (const tab of this.form.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      tab.addEventListener('click', () => this.setMode(tab.dataset.mode as Mode));
    }
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.submit();
    });

    this.setMode('login');
    const session = getSession();
    if (session) {
      this.field('username').value = session.username;
      void this.resume();
    } else {
      this.field('username').focus();
    }
  }

  private field(name: 'username' | 'password'): HTMLInputElement {
    return this.form.elements.namedItem(name) as HTMLInputElement;
  }

  private setMode(mode: Mode): void {
    this.form.dataset.mode = mode;
    for (const tab of this.form.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    }
    this.field('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    find(this.form, '.auth-submit').textContent = SUBMIT_LABEL[mode];
    this.showError('');
  }

  private async submit(): Promise<void> {
    const username = this.field('username').value.trim();
    const password = this.field('password').value;
    const authenticate = this.form.dataset.mode === 'register' ? register : login;
    await this.attempt(async () => {
      await authenticate(username, password);
      await this.enterGame();
    });
  }

  /** A token from a previous visit: skip the form if it is still valid, else drop it. */
  private async resume(): Promise<void> {
    await this.attempt(() => this.enterGame(), 'Resuming…', clearSession);
  }

  private async enterGame(): Promise<void> {
    const save = (await loadSave()) ?? newSave();
    this.scene.start(SCENES.game, { save } satisfies GameSceneData);
  }

  /** Runs an API action with the form locked; on failure, shows the error and unlocks. */
  private async attempt(
    action: () => Promise<void>,
    busyLabel = 'Please wait…',
    onUnauthorized?: () => void,
  ): Promise<void> {
    const fieldset = find<HTMLFieldSetElement>(this.form, 'fieldset');
    const submit = find(this.form, '.auth-submit');
    fieldset.disabled = true;
    submit.textContent = busyLabel;
    this.showError('');
    try {
      await action();
    } catch (err) {
      if (onUnauthorized && err instanceof ApiError && err.status === 401) {
        onUnauthorized();
      } else {
        this.showError(err instanceof ApiError ? err.message : 'Something went wrong.');
        console.error(err);
      }
      fieldset.disabled = false;
      submit.textContent = SUBMIT_LABEL[this.form.dataset.mode as Mode];
      this.field(this.field('username').value ? 'password' : 'username').focus();
    }
  }

  private showError(message: string): void {
    find(this.form, '.auth-error').textContent = message;
  }
}
