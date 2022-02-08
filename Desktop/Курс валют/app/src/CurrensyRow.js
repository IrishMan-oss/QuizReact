import React from 'react';

const CurretRow = (props) => {

const {
    currencyOptions,
    selectedCurrency,
    onChangeCurrency,
    OnChangeAmount,
    amount
} = props

    return (
        <div>
            <input type="number" className="input" value={amount} onChange={OnChangeAmount}/>
                <select value={selectedCurrency} onChange={onChangeCurrency}>
                    {currencyOptions.map(option =>(
                        <option key={option} value={option}>{option}</option>
                    ))
                    }
                </select>            
        </div>
    );
};

export default CurretRow;