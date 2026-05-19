document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const calendarSquares = document.querySelectorAll('.calendar-square');

    // Default tasks for first load if localStorage is empty
    const defaultTasks = [];

    // Initialize state from LocalStorage or use defaults
    let tasks = JSON.parse(localStorage.getItem('dashboard_tasks')) || defaultTasks;
    let startDate = localStorage.getItem('dashboard_startDate');
    // Initialize an array of 50 days (all 0% initially)
    let calendarHistory = JSON.parse(localStorage.getItem('dashboard_calendar')) || new Array(50).fill(0);

    // Streak state (persisted)
    const streakCounter = document.getElementById('streak-counter');
    let streak = parseInt(localStorage.getItem('dashboard_streak')) || 0;
    // Date (to prevent multiple increments in the same day)
    let streakDate = localStorage.getItem('dashboard_streak_date') || null;
    // Initialize streak display
    if (streakCounter) streakCounter.innerText = streak;
    // 24-Hour Reset Logic (Clear tasks on a new day)
    const todayStr = new Date().toDateString();
    let lastActiveDate = localStorage.getItem('dashboard_lastActiveDate');

    if (lastActiveDate && lastActiveDate !== todayStr) {
        // It's a new day! Clear the task list for today
        tasks = [];
        localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
    }
    // Update last active date to today
    localStorage.setItem('dashboard_lastActiveDate', todayStr);

    // Set start date to today if it doesn't exist yet
    if (!startDate) {
        startDate = new Date().toDateString();
        localStorage.setItem('dashboard_startDate', startDate);
    }

    // Calculate which box index we are currently on (0 to 49)
    const calculateCurrentDayIndex = () => {
        const start = new Date(startDate);
        const today = new Date(new Date().toDateString()); // normalize to midnight
        const diffTime = Math.abs(today - start);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.min(diffDays, 49); // Cap at 49 to keep within the 50-box grid
    };

    let currentDayIndex; // will be set during initialization

    // Helper to persist calendar to localStorage
    const saveCalendar = () => {
        localStorage.setItem('dashboard_calendar', JSON.stringify(calendarHistory));
    };

    // Helper to persist streak to localStorage
    const saveStreak = () => {
        localStorage.setItem('dashboard_streak', String(streak));
        if (streakDate) localStorage.setItem('dashboard_streak_date', streakDate);
        else localStorage.removeItem('dashboard_streak_date');
    };

    // Core functionality to update progress calculations
    const updateProgress = () => {
        let percentage = 0;
        
        if (tasks.length > 0) {
            // Calculate today's completion percentage
            const completedTasks = tasks.filter(task => task.completed).length;
            percentage = Math.round((completedTasks / tasks.length) * 100);
        }

        // Update Overall Progress Bar Width and Text
        progressBar.style.width = `${percentage}%`;
        progressPercentage.innerText = `${percentage}%`;

        // Save today's percentage into the calendar history array
        calendarHistory[currentDayIndex] = percentage;
        saveCalendar();

        // Streak logic:
        // - Only increment the streak once per day when today's percentage reaches 100%
        // - If any task is not completed (percentage < 100) the streak resets to 0
        if (percentage === 100) {
            // Only increment if we haven't already incremented today
            if (streakDate !== todayStr) {
                streak = (streak || 0) + 1;
                streakDate = todayStr;
                saveStreak();
            }
        } else {
            // Any incomplete task resets the streak immediately
            if (streak !== 0) {
                streak = 0;
                streakDate = null;
                saveStreak();
            }
        }

        // Update streak display
        if (streakCounter) streakCounter.innerText = streak;
        // Update Calendar UI to reflect new percentages
        renderCalendar();
    };

    // Initialization: load persisted state and render UI
    const initApp = () => {
        // Re-load persistent state (in case it changed before script ran)
        tasks = JSON.parse(localStorage.getItem('dashboard_tasks')) || tasks;
        calendarHistory = JSON.parse(localStorage.getItem('dashboard_calendar')) || calendarHistory;
        streak = parseInt(localStorage.getItem('dashboard_streak')) || streak;
        streakDate = localStorage.getItem('dashboard_streak_date') || streakDate;
        startDate = localStorage.getItem('dashboard_startDate') || startDate;

        // Recalculate current day index now that startDate is known
        currentDayIndex = calculateCurrentDayIndex();

        // Update streak UI
        if (streakCounter) streakCounter.innerText = streak;

        // Render tasks and calendar from loaded state
        renderTasks();
        renderCalendar();

        // Ensure today's progress and streak reflect current tasks
        updateProgress();
    };

    // Render Calendar Colors based on percentage logic
    const renderCalendar = () => {
        calendarSquares.forEach((square, index) => {
            // Remove all existing green level classes first to reset to black default
            square.classList.remove('level-1', 'level-2', 'level-3', 'level-4');
            
            const percent = calendarHistory[index];
            if (percent > 0) {
                // Apply specific classes based on completion bracket
                if (percent >= 1 && percent <= 33) square.classList.add('level-1');
                else if (percent >= 34 && percent <= 66) square.classList.add('level-2');
                else if (percent >= 67 && percent <= 99) square.classList.add('level-3');
                else if (percent === 100) square.classList.add('level-4');
            }
        });
    };

    // Render Task List DOM elements
    const renderTasks = () => {
        taskList.innerHTML = ''; // Clear existing
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = 'task-item';
            
            // Re-create the custom checkbox HTML dynamically with delete button
            li.innerHTML = `
                <div class="task-content">
                    <label class="custom-checkbox">
                        <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        <span class="task-text">${task.text}</span>
                    </label>
                </div>
                <button class="delete-task-btn" data-index="${index}" aria-label="Delete Task">✕</button>
            `;
            taskList.appendChild(li);
        });

        // Attach event listeners to all newly created checkboxes
        const checkboxes = document.querySelectorAll('.custom-checkbox input');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = e.target.getAttribute('data-index');
                tasks[idx].completed = e.target.checked; // Update task state
                saveTasks();
                updateProgress(); // Recalculate progress bars and calendar
            });
        });

        // Attach event listeners to delete buttons
        const deleteButtons = document.querySelectorAll('.delete-task-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                tasks.splice(idx, 1); // Remove task from array
                saveTasks();
                renderTasks();
                updateProgress();
            });
        });
    };

    // Helper: Save tasks array to localStorage
    const saveTasks = () => {
        localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
    };

    // Function to add a new task from input
    const addTask = () => {
        const text = taskInput.value.trim();
        if (text !== '') {
            tasks.push({ text: text, completed: false }); // Add new unchecked task
            taskInput.value = ''; // Clear input
            
            saveTasks();
            renderTasks();
            updateProgress();
            
            // Smoothly scroll to the bottom of the task list container
            const taskContainer = document.querySelector('.task-list-container');
            taskContainer.scrollTop = taskContainer.scrollHeight;
        }
    };

    // Event Listeners for Adding Tasks
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Modal Logic for Resetting Progress
    const resetBtn = document.getElementById('reset-progress-btn');
    const resetModal = document.getElementById('reset-modal');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalClearBtn = document.getElementById('modal-clear-btn');

    if (resetBtn && resetModal) {
        resetBtn.addEventListener('click', () => {
            resetModal.classList.add('active');
        });
    }

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            resetModal.classList.remove('active');
        });
    }

    if (modalClearBtn) {
        modalClearBtn.addEventListener('click', () => {
            localStorage.clear();
            location.reload();
        });
    }

    // Run initialization on page load
    initApp();
});
