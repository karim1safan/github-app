// ==== GLOBAL VARIABLES ====
const searchForm = document.getElementById("search-form");
const usernameInput = document.getElementById("username");

const submitButton = document.getElementById("submit-btn");

const topics = document.getElementById("topics");

const reposContainer = document.getElementById("repos-container");
const pagination = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const panelHeader = document.getElementById("panel-header");

let username = "";
let perPage = 5;
let page = 1;
let mode = "user"; // lang
let lang = "";

// ==== event listeners ====
topics.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    lang = e.target.innerText.trim();
    page = 1; // make a reset
    mode = "lang";
    console.log(lang);

    fetchLangRepos(lang);
  }
});

// ==== pagination buttons ====
prevBtn.addEventListener("click", () => {
  if (page > 1) {
    page--;
    loadData(mode);
  }
});

nextBtn.addEventListener("click", () => {
  page++;
  loadData(mode);
});

// ==== LOGIC ====
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  username = usernameInput.value.trim();

  if (!username) {
    reposContainer.innerHTML = `<p>Please enter a username</p>`;
    return;
  }

  page = 1; // make a reset
  mode = "user";
  // fetch data
  fetchUserRepos(username);
});

// ==== fetch user repos ====
async function fetchUserRepos(username) {
  reposContainer.innerHTML = `<p>Loading...</p>`;

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}`,
    );

    if (response.status === 404) {
      reposContainer.innerHTML = `<p>User not found</p>`;
      return;
    }

    if (!response.ok) {
      reposContainer.innerHTML = `<p>No repositories found</p>`;
      pagination.style.display = "none";
      return;
    }

    const data = await response.json();

    if (data.length === 0) {
      reposContainer.innerHTML = `<p>No repositories found</p>`;
      return;
    }

    console.log(data);

    displayRepos(data, null); // User repos don't have a max page limit
  } catch (error) {
    reposContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

// ==== fetch lang repos ====
async function fetchLangRepos(lang) {
  reposContainer.innerHTML = `<p>Loading...</p>`;
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=language:${lang}&per_page=${perPage}&page=${page}`,
    );

    // Handle rate limiting specifically
    if (response.status === 403) {
      reposContainer.innerHTML = `<p>Rate limit exceeded. Please wait and try again.</p>`;
      return;
    }

    if (!response.ok) {
      reposContainer.innerHTML = `<p>Something went wrong</p>`;
      return;
    }

    const data = await response.json();

    if (data.items === 0 || data.items.length === 0) {
      reposContainer.innerHTML = `<p>No repositories found</p>`;
      pagination.style.display = "none";
      return;
    }
    const maxPage = Math.ceil(Math.min(data.total_count, 1000) / perPage);
    displayRepos(data.items, maxPage); // GitHub Search API doesn't provide total count for pagination
  } catch (error) {
    reposContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

// ==== render user repos ====
function displayRepos(repos, maxPage) {
  reposContainer.innerHTML = "";

  let html = "";
  repos.forEach((repo) => {
    html += `
    <div class="repo-item" onclick=showIssues('${repo.full_name}')>
      <div class="repo-header">
        <div class="repo-name">
          <i class="fa-solid fa-book"></i>
          <h3>${repo.full_name}</h3>
          <a href="${repo.html_url}" target="_blank" class="visit-btn">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
        <span class="lang-badge">
          <span class="lang-dot"></span>
          ${repo.language || "N/A"}
        </span>
      </div>

      <p class="repo-desc">${repo.description || "N/A"}</p>

      <div class="repo-data">
        <p class="stars">
          <i class="fa-solid fa-star"></i>
          <span>${repo.stargazers_count}</span>
        </p>
        <p class="forks">
          <i class="fa-solid fa-code-fork"></i>
          <span>${repo.forks_count}</span>
        </p>
        <p class="issues">
          <i class="fa-solid fa-bug"></i>
          <span>${repo.open_issues_count}</span>
        </p>
      </div>
    </div>`;
  });

  reposContainer.innerHTML = html;
  pagination.style.display = "flex";
  prevBtn.disabled = page === 1;
  nextBtn.disabled = maxPage ? page >= maxPage : repos.length < perPage;
}

function loadData(mode) {
  if (mode === "user") {
    fetchUserRepos(username);
  } else {
    fetchLangRepos(lang);
  }
}

async function showIssues(fullName) {
  reposContainer.innerHTML = `<p>Loading issues...</p>`;
  pagination.style.display = "none";

  try {
    const response = await fetch(
      `https://api.github.com/repos/${fullName}/issues?per_page=20&state=open`,
    );

    if (!response.ok) {
      reposContainer.innerHTML = `<p>Failed to load issues</p>`;
      return;
    }

    const issues = await response.json();

    displayIssues(issues, fullName);
  } catch (error) {
    reposContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

// ==== render issues ====
function displayIssues(issues, fullName) {
  let html = `
    <div class="issues-header">
      <button class="back-btn" onclick="goBack()">
        <i class="fa-solid fa-arrow-left"></i> Back
      </button>
      <h2><i class="fa-solid fa-bug"></i> Issues — ${fullName}</h2>
    </div>`;

  if (issues.length === 0) {
    html += `<p>No open issues found for this repository.</p>`;
    reposContainer.innerHTML = html;
    return;
  }

  issues.forEach((issue) => {
    const labels = issue.labels
      .map(
        (label) =>
          `<span class="issue-label" style="background:#${label.color}">${label.name}</span>`,
      )
      .join("");

    html += `
    <div class="issue-item">
      <div class="issue-header">
        <i class="fa-solid fa-circle-dot issue-icon"></i>
        <a href="${issue.html_url}" target="_blank" class="issue-title">${issue.title}</a>
      </div>
      <div class="issue-meta">
        <span>#${issue.number}</span>
        <span>Opened by <strong>${issue.user.login}</strong></span>
        <span>${new Date(issue.created_at).toLocaleDateString()}</span>
      </div>
      ${labels ? `<div class="issue-labels">${labels}</div>` : ""}
    </div>`;
  });

  reposContainer.innerHTML = html;
}

// ==== go back ====
function goBack() {
  loadData(mode);
  pagination.style.display = "flex";
}
