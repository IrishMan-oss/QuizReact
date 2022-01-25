import React from "react";
import ReactDOM from "react-dom";
import Quiz from "./components/Quiz";
import "./index.css"
import {QuizProvider} from './context/quiz'
ReactDOM.render(
  <React.StrictMode>
    <QuizProvider>
     <Quiz />
    </QuizProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
