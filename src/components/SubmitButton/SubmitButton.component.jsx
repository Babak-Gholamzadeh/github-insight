import './SubmitButton.style.scss';

const SubmitButton = ({ children, disabled, status, rest }) => {
  return (
    <button className={
      'submit-button' +
      (disabled ? ' disabled' : '') +
      ` ${status}`
    } type='submit'
      {...rest}
    >
      {children}
    </button>
  );
};

export default SubmitButton;
