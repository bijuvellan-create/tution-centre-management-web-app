import { useId } from 'react';

/** A labelled form control wrapper with hint + error messaging. */
export function Field({ label, error, hint, required, htmlFor, className, children }) {
  return (
    <div className={`field ${className || ''}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="field__hint">{hint}</div>}
      {error && (
        <div className="field__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function Input({ label, error, hint, id, fieldClassName, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      required={props.required}
      htmlFor={inputId}
      className={fieldClassName}
    >
      <input id={inputId} className="input" aria-invalid={error ? 'true' : undefined} {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, id, fieldClassName, children, ...props }) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      required={props.required}
      htmlFor={selectId}
      className={fieldClassName}
    >
      <select id={selectId} className="select" aria-invalid={error ? 'true' : undefined} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, id, fieldClassName, ...props }) {
  const autoId = useId();
  const textId = id || autoId;
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      required={props.required}
      htmlFor={textId}
      className={fieldClassName}
    >
      <textarea id={textId} className="textarea" aria-invalid={error ? 'true' : undefined} {...props} />
    </Field>
  );
}

export function Checkbox({ label, id, ...props }) {
  const autoId = useId();
  const boxId = id || autoId;
  return (
    <label className="checkbox-row" htmlFor={boxId}>
      <input id={boxId} type="checkbox" {...props} />
      {label}
    </label>
  );
}
