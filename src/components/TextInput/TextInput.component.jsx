import './TextInput.style.scss';

const TextInput = ({label, ...rest}) => {
  return (
    <div className="text-input-wrapper">
      <input
        type="text"
        autoComplete="off"
        {...rest}
      />
    </div>
  );
};

export default TextInput;
