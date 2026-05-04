// ==== GLOBAL VARIABLES ====
const searchForm = document.getElementById("search-form");
const usernameInput = document.getElementById("username");

const submitButton = document.getElementById("submit-btn");

const topics = document.getElementById("topics");
const repoToolbar = document.getElementById("repo-toolbar");
const repoFilterInput = document.getElementById("repo-filter");
const repoSortSelect = document.getElementById("repo-sort");
const repoCounter = document.getElementById("repo-counter");

const reposContainer = document.getElementById("repos-container");
const pagination = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const panelHeader = document.getElementById("panel-header");
const topicTerm = document.getElementById("topic-term");
const resultsCount = document.getElementById("results-count");

let username = "";
let perPage = 5;
let page = 1;
let mode = "user"; // lang | issues
let lang = "";
let currentRepo = "";
let prevMode = "user";
let allRepos = [];
let currentRepos = [];
let currentMaxPage = null;

repoFilterInput.addEventListener("input", () => {
  page = 1;
  applyFiltersAndSort();
});
repoSortSelect.addEventListener("change", () => {
  page = 1;
  applyFiltersAndSort();
});

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
    if (mode === "user") {
      applyFiltersAndSort();
    } else {
      loadData(mode);
    }
  }
});

nextBtn.addEventListener("click", () => {
  page++;
  if (mode === "user") {
    applyFiltersAndSort();
  } else {
    loadData(mode);
  }
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
  allRepos = [];
  reposContainer.innerHTML = `<p>Loading...</p>`;
  hideRepoToolbar();

  try {
    const repos = await fetchAllUserRepos(username);

    if (repos.length === 0) {
      reposContainer.innerHTML = `<p>No repositories found</p>`;
      pagination.style.display = "none";
      return;
    }

    allRepos = repos;
    page = 1;
    showUserRepositories(username);
  } catch (error) {
    reposContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

async function fetchAllUserRepos(username) {
  const repos = [];
  let currentPage = 1;

  while (true) {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${currentPage}`,
    );

    if (response.status === 404) {
      throw new Error("User not found");
    }

    if (response.status === 403) {
      throw new Error("Rate limit exceeded. Please wait and try again.");
    }

    if (!response.ok) {
      throw new Error("No repositories found");
    }

    const pageRepos = await response.json();
    repos.push(...pageRepos);

    if (pageRepos.length < 100) {
      break;
    }

    currentPage++;
  }

  return repos;
}

// ==== fetch lang repos ====
async function fetchLangRepos(lang) {
  reposContainer.innerHTML = `<p>Loading...</p>`;
  hideRepoToolbar();
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
    showTopicRepositories(data.items, maxPage, `${lang} repositories`, data.total_count); // GitHub Search API provides the total count for the topic search
  } catch (error) {
    reposContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

function showUserRepositories(username) {
  updateRepoHeader(`${username}'s repositories`, allRepos.length);
  repoFilterInput.value = "";
  repoSortSelect.value = "default";
  repoToolbar.style.display = "flex";
  applyFiltersAndSort();
}

function showTopicRepositories(repos, maxPage, title, totalCount) {
  currentRepos = repos;
  currentMaxPage = maxPage;
  updateRepoHeader(title, totalCount);
  renderRepositories(repos);
  pagination.style.display = "flex";
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page >= maxPage;
}

function updateRepoHeader(title, totalCount) {
  panelHeader.style.display = "flex";
  topicTerm.style.display = "flex";
  resultsCount.style.display = "inline-flex";
  topicTerm.textContent = title;
  resultsCount.textContent = `${totalCount} repositories`;
}

function hideRepoToolbar() {
  repoToolbar.style.display = "none";
  panelHeader.style.display = "none";
}

function applyFiltersAndSort() {
  if (mode !== "user") {
    return;
  }

  const filterValue = repoFilterInput.value.trim().toLowerCase();
  const sortValue = repoSortSelect.value;

  let filteredRepos = allRepos.filter((repo) =>
    (repo.name || "").toLowerCase().includes(filterValue),
  );

  if (sortValue !== "default") {
    filteredRepos = [...filteredRepos].sort((leftRepo, rightRepo) => {
      if (sortValue === "stars") {
        return rightRepo.stargazers_count - leftRepo.stargazers_count;
      }

      if (sortValue === "forks") {
        return rightRepo.forks_count - leftRepo.forks_count;
      }

      if (sortValue === "issues") {
        return rightRepo.open_issues_count - leftRepo.open_issues_count;
      }

      if (sortValue === "updated") {
        return new Date(rightRepo.updated_at) - new Date(leftRepo.updated_at);
      }

      return 0;
    });
  }

  const totalFiltered = filteredRepos.length;
  const maxPage = totalFiltered === 0 ? 1 : Math.ceil(totalFiltered / perPage);

  if (page > maxPage) {
    page = maxPage;
  }

  const startIndex = (page - 1) * perPage;
  const pageRepos = filteredRepos.slice(startIndex, startIndex + perPage);

  if (pageRepos.length === 0) {
    reposContainer.innerHTML = `<div id="no-repo-message">No repositories match your filter.</div>`;
  } else {
    renderRepositories(pageRepos);
  }

  repoCounter.textContent =
    totalFiltered === 0
      ? "Showing 0 of 0 repositories"
      : `Showing ${startIndex + 1}-${Math.min(startIndex + perPage, totalFiltered)} of ${totalFiltered} repositories`;
  resultsCount.textContent = `${allRepos.length} total repositories`;
  pagination.style.display = "flex";
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page >= maxPage;
}

// ==== render user repos ====
function renderRepositories(repos) {
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
}

function loadData(mode) {
  if (mode === "user") {
    applyFiltersAndSort();
  } else if (mode === "issues") {
    fetchIssues();
  } else {
    fetchLangRepos(lang);
  }
}

async function showIssues(fullName) {
  if (mode !== "issues") {
    prevMode = mode;
  }
  currentRepo = fullName;
  page = 1;
  mode = "issues";
  fetchIssues();
}

// ==== fetch issues ====
async function fetchIssues() {
  reposContainer.innerHTML = `<p>Loading issues...</p>`;
  pagination.style.display = "none";
  hideRepoToolbar();

  try {
    const response = await fetch(
      `https://api.github.com/repos/${currentRepo}/issues?per_page=${perPage}&page=${page}&state=open`,
    );

    if (!response.ok) {
      reposContainer.innerHTML = `<p>Failed to load issues</p>`;
      return;
    }

    const issues = await response.json();

    displayIssues(issues);
  } catch (error) {
    reposContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

// ==== render issues ====
function displayIssues(issues) {
  let html = `
    <div class="issues-header">
      <button class="back-btn" onclick="goBack()">
        <i class="fa-solid fa-arrow-left"></i> Back
      </button>
      <h2><i class="fa-solid fa-bug"></i> Issues — ${currentRepo}</h2>
    </div>`;

  if (issues.length === 0) {
    html += `<p>No open issues found for this repository.</p>`;
    reposContainer.innerHTML = html;
    pagination.style.display = "none";
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
  pagination.style.display = "flex";
  prevBtn.disabled = page === 1;
  nextBtn.disabled = issues.length < perPage;
}

// ==== go back ====
function goBack() {
  mode = prevMode;
  page = 1;
  loadData(mode);
}
