import React, { useState, useEffect } from 'react';

const Autocomplete = ({ onSelect }) => {
  const [inputValue, setInputValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    // Agregar event listener para manejar eventos de teclado
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prevIndex => (prevIndex < filteredOptions.length - 1 ? prevIndex + 1 : prevIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
      } else if (e.key === 'Enter' && selectedIndex !== -1) {
        handleSelectOption(filteredOptions[selectedIndex]);
      }
    };

    // Agregar event listener al montar el componente
    document.addEventListener('keydown', handleKeyDown);

    // Remover event listener al desmontar el componente
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, filteredOptions]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    const estadosEstadosUnidos = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida',
      'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
      'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska',
      'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
      'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];

    // Verificar si el valor de entrada está vacío
    if (value.trim() === '') {
      setFilteredOptions([]);
    } else {
      // Filtrar opciones basadas en el valor de entrada
      const filtered = estadosEstadosUnidos.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
      setSelectedIndex(-1); // Reiniciar el índice seleccionado al cambiar el valor de entrada
    }
  };

  const handleSelectOption = (option) => {
    setInputValue(option);
    setFilteredOptions([]);
    onSelect(option);
  };

  return (
    <div>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Buscar..."
        className="input input-bordered input-error w-full max-w-xs bg-white-500"
      />
      <ul>
        {filteredOptions.map((option, index) => (
          <li
            key={index}
            onClick={() => handleSelectOption(option)}
            className={index === selectedIndex ? 'selected' : ''}
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Autocomplete;
