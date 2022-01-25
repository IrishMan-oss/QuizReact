import React from 'react';
import Answer from './Answer';
import { useContext } from 'react';
import { QuizContext } from '../context/quiz';

const Question = () => {
    const [quizState, dispatch] = useContext(QuizContext)
    console.log(quizState)
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex]
    return (
        <div>
            <div className='question'>{currentQuestion.question}</div>
              <div className='answers'>
                {quizState.answers.map((answer, index) => (
                        <Answer 
                        key={index} 
                        index={index}
                        answerText={answer} 
                        correctAnswer={currentQuestion.correctAnswer}
                        currentAnswer={quizState.currentAnswer}
                        onSelectAnswer={(answerText) => dispatch({type: 'SELECT_ANSWER', payload: answerText})}
                        
                        />
                ))}
                
              
             </div>
        </div>
    );
}

export default Question;
