import React, {useEffect,useState} from 'react';
import './App.css';
import CurrensyRow from './CurrensyRow';

const BASE_URL = "https://www.cbr-xml-daily.ru/latest.js"

function App() {
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [formCurrency,setFormCurrency] = useState()
  const [toCurrency, setToCurrency] = useState()
  const [currentCourse, setCurrentCourse] = useState()
  const [currentCourseUSD, setCurrentCourseUSD] = useState()
  const [exchangeRate, setExchangeRate] = useState()
  const [amount, setAmount] = useState(1)
  const [amountInFromCurrency, setAmountInFormCurrency] = useState(true)
  

  let toAmount, fromAmount 
  if(amountInFromCurrency){
    fromAmount = amount
    toAmount = amount * exchangeRate
  } else {
    toAmount = amount
    fromAmount = amount / exchangeRate
  }

  useEffect(()=> {
    fetch(BASE_URL)
    .then(res => res.json())
    .then(data => {
      const firstCurrency = Object.keys(data.rates)[27]
     
       setCurrencyOptions([data.base, ...Object.keys(data.rates)])
       setFormCurrency(data.base)
       setCurrentCourse(data.rates.USD)
       setCurrentCourseUSD(data.rates.UAH)
       setToCurrency(firstCurrency)
       setExchangeRate(data.rates[firstCurrency])
    })
  },[])

  useEffect(() => {
    if (formCurrency != null && toCurrency != null) {
      fetch(`${BASE_URL}?base=${formCurrency}&symbols=${toCurrency}`)
        .then(res => res.json())
        .then(data => setExchangeRate(data.rates[toCurrency]))
    }
  }, [formCurrency, toCurrency])

    function handleFormAmoundChange(e) {
      setAmount(e.target.value)
      setAmountInFormCurrency(true)
    }
    function handleToAmoundChange(e) {
      setAmount(e.target.value)
      setAmountInFormCurrency(false)
    }


  return (
    <div className="App">
       <header>
        <p>Текущий курс UAH = {currentCourse} </p>
        <p>Текущий курс USD = {currentCourseUSD} </p>

        
      </header>
        <h1>Обмнен валют</h1>
        <CurrensyRow 
        currencyOptions ={currencyOptions}
        selectedCurrency ={formCurrency}
        onChangeCurrency={e => setFormCurrency(e.target.value)}
        OnChangeAmount={handleFormAmoundChange}
        amount ={fromAmount}
        />
        <div className="equals">&#8596;</div>
        <CurrensyRow
        currencyOptions ={currencyOptions}
        selectedCurrency ={toCurrency}
        onChangeCurrency={e => setToCurrency(e.target.value)}
        OnChangeAmount={handleToAmoundChange}
        amount ={toAmount}
        />
    </div>
  );
}

export default App;
