const btn_tesoura = document.querySelector('.tesoura')
const btn_pedra = document.querySelector('.pedra')
const btn_papel = document.querySelector('.papel')
let escolha
let escolhaAdversario
const resultadoTexto = document.querySelector('.resultado')
const mensagemTexto = document.querySelector('.mensagem')

// INFORMAÇÕES
let cVitorias = 0,
    cDerrotas = 0,
    cEmpates = 0

const n1 = document.querySelector('.n1')
const n2 = document.querySelector('.n2')
const n3 = document.querySelector('.n3')


//tesoura
btn_tesoura.addEventListener('click', () => {
    // alert("tesoura")
    escolha = "Tesoura"
    escolhaAdversario = ["Tesoura", "Pedra", "Papel"][Math.floor(Math.random() * 3)]

    mensagemTexto.classList.add('animado')
    setTimeout(() => {
        mensagemTexto.classList.remove('animado')
    }, 1000)

    resultadoTexto.classList.add('animado')
    setTimeout(() => {
        resultadoTexto.classList.remove('animado')
    }, 1000)

    if(escolha == escolhaAdversario) {
        resultadoTexto.textContent = escolhaAdversario + " ✂"
        mensagemTexto.textContent = "Empate!"

        cEmpates++
        n3.innerHTML = cEmpates

    } else if(escolhaAdversario == "Pedra") {
        resultadoTexto.textContent = escolhaAdversario + " 🗿"
        mensagemTexto.textContent = "Derrota!"

        cDerrotas++
        n2.innerHTML = cDerrotas

    } else {
        resultadoTexto.textContent = escolhaAdversario + " 📜"
        mensagemTexto.textContent = "Vitória!"
        
        cVitorias++
        n1.innerHTML = cVitorias

    }
})

//pedra
btn_pedra.addEventListener('click', () => {
    // alert("pedra")
    escolha = "Pedra"
    escolhaAdversario = ["Tesoura", "Pedra", "Papel"][Math.floor(Math.random() * 3)]

    mensagemTexto.classList.add('animado')
    setTimeout(() => {
        mensagemTexto.classList.remove('animado')
    }, 1000)

    resultadoTexto.classList.add('animado')
    setTimeout(() => {
        resultadoTexto.classList.remove('animado')
    }, 1000)

    if(escolha == escolhaAdversario) {
        resultadoTexto.textContent = escolhaAdversario + " 🗿"
        mensagemTexto.textContent = "Empate!"

        cEmpates++
        n3.innerHTML = cEmpates

    } else if(escolhaAdversario == "Papel") {
        resultadoTexto.textContent = escolhaAdversario + " 📜"
        mensagemTexto.textContent = "Derrota!"

        cDerrotas++
        n2.innerHTML = cDerrotas

    } else {
        resultadoTexto.textContent = escolhaAdversario + " ✂"
        mensagemTexto.textContent = "Vitória!"

        cVitorias++
        n1.innerHTML = cVitorias

    }
})

//papel
btn_papel.addEventListener('click', () => {
    // alert("papel")
    escolha = "Papel"
    escolhaAdversario = ["Tesoura", "Pedra", "Papel"][Math.floor(Math.random() * 3)]

    mensagemTexto.classList.add('animado')
    setTimeout(() => {
        mensagemTexto.classList.remove('animado')
    }, 1000)

    resultadoTexto.classList.add('animado')
    setTimeout(() => {
        resultadoTexto.classList.remove('animado')
    }, 1000)

    if(escolha == escolhaAdversario) {
        resultadoTexto.textContent = escolhaAdversario + " 📜"
        mensagemTexto.textContent = "Empate!"

        cEmpates++
        n3.innerHTML = cEmpates

    } else if(escolhaAdversario == "Tesoura") {
        resultadoTexto.textContent = escolhaAdversario + " ✂"
        mensagemTexto.textContent = "Derrota!"

        cDerrotas++
        n2.innerHTML = cDerrotas

    } else {
        resultadoTexto.textContent = escolhaAdversario + " 🗿"
        mensagemTexto.textContent = "Vitória!"

        cVitorias++
        n1.innerHTML = cVitorias

    }
})
