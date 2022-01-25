import {useContext, useEffect, useReducer} from 'react';
import { QuizContext } from '../context/quiz';
import Question from './Question';



const Quiz = () => {
    const [quizState, dispatch] = useContext(QuizContext)
    const apiUrl ='https://opentdb.com/api.php?amount=8&type=multiple&encode=url3986'
    useEffect(() => {
       if(quizState.questions > 0){
           return 
       }
        fetch(apiUrl).then(res => res.json()).then(data => {
            dispatch({type: 'LOADED_QUESTIONS', payload: data.results})
        })
    },[])

    return (
        <div className='quiz'>
            {quizState.showResults && (
                <div className='results'>
                    <div className='congratulations'>Congratulations</div>
                    <div className='results-info'>
                        <div> You have complete the quiz.</div>
                        <div>You have {quizState.correctAnswerCount} of {quizState.questions.length}</div>
                        <div 
                            className='next-button' 
                            onClick={() => dispatch({type: "RESTART" })}
                        >
                            Restart
                        </div>
                    </div>
                </div>
            )}
       
            {!quizState.showResults && quizState.questions.length > 0 && (
                <div>
                    <div className='score'>Question {quizState.currentQuestionIndex + 1}/
                    {quizState.questions.length}</div>
                    <Question  
                        questions={quizState.questions}/>
                    <div 
                        className='next-button' 
                        onClick={() => dispatch({type: 'NEXT_QUESTION'})}
                    >
                        Next question
                    </div>
                </div>
            )}
        </div>

    );
}

export default Quiz;
