interface SwitchProps {
  activo: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
}

export function Switch({ activo, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50 ${
        activo ? 'bg-green-500' : 'bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          activo ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
