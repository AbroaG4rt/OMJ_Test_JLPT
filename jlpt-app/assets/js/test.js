// assets/js/test.js

document.addEventListener('DOMContentLoaded', async () => {
    if (!OmoshiroiUtils.requireAuth()) return;

    let testState = JSON.parse(localStorage.getItem('omoshiroi_active_test'));
    if (!testState) {
        window.location.href = 'dashboard.html';
        return;
    }

    const { level, endTime } = testState;
    document.getElementById('testLevelBadge').textContent = level;

    // Security: Tab Switch Detection
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            alert("⚠️ Warning: Please do not leave the test tab. Your actions are recorded.");
        }
    });

    // Elements
    const timerDisplay = document.getElementById('timerDisplay');
    const questionsContainer = document.getElementById('questionsContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const forceSubmitBtn = document.getElementById('forceSubmitBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let allQuestions = [];
    const QUESTIONS_PER_PAGE = 10;
    let currentPage = 0;
    let totalPages = 0;

    // Timer Logic
    const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "00:00";
            alert("Time is up! Submitting automatically.");
            submitTest();
            return;
        }

        const secondsLeft = Math.floor(distance / 1000);
        timerDisplay.textContent = OmoshiroiUtils.formatTime(secondsLeft);

        if (secondsLeft < 300) { // Last 5 minutes
            timerDisplay.classList.add('timer-critical');
        }
    }, 1000);

    // Fetch Questions
    try {
        const response = await fetch(`data/${level}.json`);
        let questions = await response.json();
        
        // Shuffle questions
        questions = questions.sort(() => Math.random() - 0.5);
        allQuestions = questions;
        totalPages = Math.ceil(allQuestions.length / QUESTIONS_PER_PAGE);
        
        renderPage(0);
        updateProgress();
    } catch (error) {
        console.error("Failed to load questions", error);
        questionsContainer.innerHTML = "<p class='text-center'>Error loading questions. Please try again.</p>";
    }

    function renderPage(pageIndex) {
        currentPage = pageIndex;
        questionsContainer.innerHTML = '';

        const startIdx = pageIndex * QUESTIONS_PER_PAGE;
        const endIdx = Math.min(startIdx + QUESTIONS_PER_PAGE, allQuestions.length);
        const pageQuestions = allQuestions.slice(startIdx, endIdx);

        pageQuestions.forEach((q, idx) => {
            const globalIndex = startIdx + idx + 1;
            const qDiv = document.createElement('div');
            qDiv.className = 'question-item';

            let mediaHTML = '';
            if (q.image) mediaHTML += `<img src="assets/images/${q.image}" alt="Question Image" style="max-width:100%; border-radius:4px; margin-bottom:1rem; display:block;">`;
            if (q.audio) mediaHTML += `<audio controls style="width:100%; margin-bottom:1rem;"><source src="assets/audio/${q.audio}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;

            let optionsHTML = '';
            for (const [key, value] of Object.entries(q.options)) {
                // Check if this option was previously selected
                const isChecked = testState.answers[q.id] === key;
                optionsHTML += `
                    <label class="option-label ${isChecked ? 'selected' : ''}" data-qid="${q.id}" data-opt="${key}">
                        <input type="radio" name="q_${q.id}" value="${key}" ${isChecked ? 'checked' : ''} style="display:none;">
                        <strong>${key}.</strong> ${value}
                    </label>
                `;
            }

            qDiv.innerHTML = `
                <div class="question-text">${globalIndex}. ${q.question}</div>
                ${mediaHTML}
                <div class="options-grid">
                    ${optionsHTML}
                </div>
            `;
            questionsContainer.appendChild(qDiv);
        });

        // Add event listeners to labels for custom styling
        document.querySelectorAll('.option-label').forEach(label => {
            label.addEventListener('click', function(e) {
                // The label click will automatically check the radio button
                const qid = this.getAttribute('data-qid');
                const opt = this.getAttribute('data-opt');
                
                // Remove selected class from all labels in this question group
                const parentGroup = this.parentElement;
                parentGroup.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
                
                // Add selected class to this
                this.classList.add('selected');

                // Save to state instantly
                testState.answers[qid] = opt;
                localStorage.setItem('omoshiroi_active_test', JSON.stringify(testState));
                
                updateProgress();
            });
        });

        // Pagination Buttons State
        prevBtn.disabled = currentPage === 0;
        
        if (currentPage === totalPages - 1) {
            nextBtn.textContent = "Finish Test";
            nextBtn.classList.remove('btn-primary');
            nextBtn.classList.add('btn-primary');
            nextBtn.style.backgroundColor = "var(--success-color)";
        } else {
            nextBtn.textContent = "Next →";
            nextBtn.style.backgroundColor = "var(--primary-color)";
        }
    }

    function updateProgress() {
        const answeredCount = Object.keys(testState.answers).length;
        const total = allQuestions.length;
        const percentage = total > 0 ? (answeredCount / total) * 100 : 0;
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${answeredCount} / ${total}`;
    }

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) renderPage(currentPage - 1);
        window.scrollTo(0, 0);
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
            renderPage(currentPage + 1);
            window.scrollTo(0, 0);
        } else {
            // Confirm Submission
            if (confirm("Are you sure you want to submit your test?")) {
                submitTest();
            }
        }
    });

    forceSubmitBtn.addEventListener('click', () => {
        if (confirm("You are about to force submit your exam. Unanswered questions will be marked incorrect. Proceed?")) {
            submitTest();
        }
    });

    function submitTest() {
        clearInterval(timerInterval);
        
        // Disable lockdown warning so we can redirect gracefully
        window.onbeforeunload = null;

        // Calculate raw correctness client side to save to result payload
        let correctCount = 0;
        let evaluation = [];

        // Save evaluated result for result page
        allQuestions.forEach(q => {
            const userAns = testState.answers[q.id];
            const isCorrect = userAns === q.correctAnswer;
            if (isCorrect) correctCount++;
            
            evaluation.push({
                id: q.id,
                question: q.question,
                userAns: userAns || null,
                correctAnswer: q.correctAnswer,
                isCorrect: isCorrect
            });
        });

        const score = (correctCount / allQuestions.length) * 100;
        
        // Hook anti cheat
        const cheatData = window.AntiCheat ? window.AntiCheat.getProfile() : { tabSwitches: 0, copyAttempts: 0, screenshotAttempts: 0, devToolsAttempts: 0 };
        
        // Calculate Cheat Score
        const cheatScore = (cheatData.tabSwitches * 2) + (cheatData.copyAttempts * 1) + (cheatData.screenshotAttempts * 2) + (cheatData.devToolsAttempts * 3);
        cheatData.score = cheatScore;

        const finalResult = {
            level: level,
            score: score,
            correctCount: correctCount,
            totalCount: allQuestions.length,
            evaluation: evaluation,
            cheatProfile: cheatData,
            timestamp: new Date().getTime()
        };

        // Cache for Result Page
        localStorage.setItem('omoshiroi_latest_result', JSON.stringify(finalResult));
        
        // Add to history
        let history = JSON.parse(localStorage.getItem('omoshiroi_history') || '[]');
        history.push({
            level: level,
            score: score,
            timestamp: finalResult.timestamp
        });
        localStorage.setItem('omoshiroi_history', JSON.stringify(history));

        // Clear active test state securely
        localStorage.removeItem('omoshiroi_active_test');
        localStorage.removeItem('omoshiroi_cheatData');

        window.location.href = 'result.html';
    }
});
