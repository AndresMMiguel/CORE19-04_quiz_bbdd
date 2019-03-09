
const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');


/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Commandos:");
    log("  h|help - Muestra esta ayuda.");
    log("  list - Listar los quizzes existentes.");
    log("  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("  add - Añadir un nuevo quiz interactivamente.");
    log("  delete <id> - Borrar el quiz indicado.");
    log("  edit <id> - Editar el quiz indicado.");
    log("  test <id> - Probar el quiz indicado.");
    log("  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("  credits - Créditos.");
    log("  q|quit - Salir del programa.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    models.quiz.findAll().each(quiz => {
            log(`${colorize(quiz.id, "magenta")}: ${quiz.question}`);
        }).catch(error => {
        errorlog(error.message);
    })
.then(() => {
    rl.prompt();
})
};

/*
Valida el id que pasan como parámetro
*/
const validateId = id => {
return new Sequelize.Promise ((resolve, reject) =>{
    if(typeof id === "undefined"){
        reject(new Error(`Falta el parámetro <id>.`));
    }else{
        id = parseInt(id);
        if(Number.isNaN(id)){
            reject(new Error(`El valor del parámetro <id> no es un número.`));
        }else{
            resolve(id);
        }
    }
});
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
    validateId(id).then(id =>models.quiz.findByPk(id)).then(quiz =>{
        if(!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }else{
            log(` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        }
    }).catch(error => {errorlog(error.message);}).then(()=> {
        rl.prompt();
    });

};

/*
Creamos una promesa pidiendo por consola
*/
const makeQuestion = (rl,text) =>{
    return new Sequelize.Promise((resolve,reject)=>{
        rl.question(colorize(text,"red"), answer => {
            resolve(answer.trim());
        });
    });
};

/**
 * Añade un nuevo quiz al módelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl => {
    makeQuestion(rl, "Introduzca una pregunta: ").then(question => {
        return makeQuestion(rl, "Introduzca una respuesta: ").then(answer => {
            return ({question:question,answer:answer});
        });
    }).then(quiz => {
        return models.quiz.create(quiz);
    }).then(quiz => {
        log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    }).catch(Sequelize.ValidationError, error => {
        errorlog("El quiz es erróneo: ");
        error.errors.forEach(({message}) => {
            errorlog(message);
        });
    })
    .catch(error => {
        errorlog(error.message);
    }).then(() => {
        rl.prompt();
    });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    validateId(id).then(id =>models.quiz.findByPk(id)).then(quiz =>{
        if(!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }else{
            models.quiz.destroy({where: {id}});
        }
    })
    .catch(error => {errorlog(error.message);}).then(()=> {
        rl.prompt();
    });
};


/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    validateId(id).then(id =>models.quiz.findByPk(id)).then(quiz =>{
        if(!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }else{
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
           return makeQuestion(rl, "Introduzca la pregunta: ").then(question => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
               return makeQuestion(rl, "Introduzca la respuesta: ").then(answer => {
                   quiz.question = question;
                   quiz.answer = answer;
                   return quiz;
               })
           })
        }
    }).then(quiz => quiz.save()).then(quiz => {
        log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    }).catch(Sequelize.ValidationError, error => {
        errorlog("El quiz es erróneo: ");
        error.errors.forEach(({message}) => {
            errorlog(message);
        })
    })
    .catch(error => {errorlog(error.message);}).then(()=> {
        rl.prompt();
    });
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
    validateId(id).then(id =>models.quiz.findByPk(id)).then(quiz =>{
        if(!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }else{
            makeQuestion(rl, `${quiz.question}? `).then(answer => {
                if((answer || "").toLowerCase().trim() === quiz.answer.toLowerCase()){
                    biglog("CORRECTO","green");
                }else{
                    biglog("INCORRECTO","red");
                }
            }).then(() => {rl.prompt()})
        }
    }).catch(Sequelize.ValidationError, error => {
        errorlog("El quiz es erróneo: ");
        error.errors.forEach(({message}) => {
            errorlog(message);
        })
    })
    .catch(error => {errorlog(error.message);}).then(()=> {
        rl.prompt();
    });
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {
    let score = 0;
    let toBeResolved = [];
    let i = 0;

    const playOne = () =>{
         if(toBeResolved.length===0){
            log("Enhorabuena, has terminado el juego\n","green");
            log(`Número de aciertos: `);
            biglog(score,"magenta");
            rl.prompt();
        }else{
            models.quiz.count().then(count => {
            let id = Math.round((Math.random()*(count-1))+1);
        validateId(id).then(id =>models.quiz.findByPk(id)).then(quiz =>{
            if(!quiz){
                playOne();
            }else{
                if(toBeResolved.includes(id)){
                    toBeResolved.splice(toBeResolved.indexOf(id),1);
                    makeQuestion(rl, `${quiz.question}? `).then(answer => {
                    if((answer || "").toLowerCase().trim() === quiz.answer.toLowerCase()){
                        biglog("CORRECTO","green");
                        log(`Número de aciertos: ${++score}`);
                        playOne();
                    }else{
                        biglog("INCORRECTO","red");
                        log("Fin del juego. Número de aciertos: ");
                        biglog(score,"red");
                    }
                    }).then(() => {rl.prompt()});
                }else{
                    playOne();
                }   
            }   
        }).catch(error => {errorlog(error.message);}).then(()=> {
            rl.prompt();
        })
    })
    }  
    };

    models.quiz.findAll().each(quiz => toBeResolved[i++]=quiz.id).catch(error => {
       errorlog(error.message);
    }).then(() => {
       playOne();
    }).catch(error => {errorlog(error.message);}).then(()=> {
    rl.prompt();
    })
};
    
   

    /*return models.quiz.findAll();
    
    .each(quiz => {
        return toBeResolved[i++] = quiz.id;
        //log(`${toBeResolved}`)

    })
    log(`${toBeResolved}, ${i}`);
    .then(toBeResolved => {
        // mensaje de prueba
        log(`log numero 1: ${toBeResolved}`);
        if(toBeResolved.length===0){
            log("Enhorabuena, has terminado el juego\n","green");
            log(`Número de aciertos: `);
            biglog(score,"magenta");
            rl.prompt();
        }else{
            models.quiz.count().then(count => {
            let id = Math.round((Math.random()*(count-1))+1);
            // mensaje de prueba
            log(`log numero 2, valor del id creado: ${id}`);
            validateId(id).then(id =>models.quiz.findByPk(id)).then(quiz =>{
                // mensaje de prueba
                log(`quiz creado con el id aleatorio: [${id}] ${quiz.question}`);
                if(!quiz){
                    // Volver a empezar el método
                    log("prueba por si hace este if de error");
                }else{
                    // prueba
                    log("prueba por si se queda aqui");
                    if(toBeResolved.includes(id)){
                    makeQuestion(rl, `${quiz.question}? `).then(answer => {
                        if((answer || "").toLowerCase().trim() === quiz.answer.toLowerCase()){
                            biglog("CORRECTO","green");
                            log(`Número de aciertos: ${++score}`);
                            // Volver a empezar
                        }else{
                            biglog("INCORRECTO","red");
                            log("Fin del juego. Número de aciertos: ");
                            biglog(score,"red");
                            reject(new Error("El juego ha acabado"));
                        }
                    }).then(() => {rl.prompt()});
                }else{
                    // Volver a empezar
                }
            }
        }).catch(error => {errorlog(error.message);}).then(()=> {
                rl.prompt();
            })
        })
        }  
    }).catch(error => {errorlog(error.message);}).then(()=> {
        rl.prompt();
    });
    */

/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log('Autores de la práctica:');
    log('Andrés Moreno Miguel', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};

