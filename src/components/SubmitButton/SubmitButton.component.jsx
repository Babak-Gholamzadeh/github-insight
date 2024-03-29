import './SubmitButton.style.scss';

const SubmitButton = ({ children, disabled, status, onMouseOver, onMouseOut, rest }) => {
  return (
    <button
      className={
        'submit-button' +
        (disabled ? ' disabled' : '') +
        ` ${status}`
      }
      type='submit'
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      {...rest}
    >
      {children}
    </button>
  );
};

export default SubmitButton;
