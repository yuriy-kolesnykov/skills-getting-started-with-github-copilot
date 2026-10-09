document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(activity, participant) {
    const participantItem = document.createElement("li");
    participantItem.className = "participant-item";
    participantItem.dataset.participantEmail = participant;

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = participant;
    participantItem.appendChild(participantEmail);

    const unregisterButton = document.createElement("button");
    unregisterButton.type = "button";
    unregisterButton.className = "participant-remove";
    unregisterButton.setAttribute("aria-label", `Unregister ${participant} from ${activity}`);
    unregisterButton.title = "Unregister participant";
    unregisterButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"></path>
      </svg>
    `;
    participantItem.appendChild(unregisterButton);

    return participantItem;
  }

  function updateParticipantStats(activityCard, change) {
    const participantList = activityCard.querySelector(".participant-list");
    const participantCount = participantList.querySelectorAll(".participant-item").length;
    activityCard.querySelector(".participant-count").textContent = `(${participantCount})`;

    const spotsLeft = activityCard.querySelector(".spots-left");
    const updatedSpots = Math.max(0, Number(spotsLeft.dataset.spotsLeft) + change);
    spotsLeft.dataset.spotsLeft = updatedSpots;
    spotsLeft.textContent = `${updatedSpots} spots left`;
  }

  function showMessage(message, className) {
    messageDiv.textContent = message;
    messageDiv.className = className;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> <span class="spots-left" data-spots-left="${spotsLeft}">${spotsLeft} spots left</span></p>
          <div class="participants">
            <h5>Participants <span class="participant-count">(${details.participants.length})</span></h5>
            <ul class="participant-list"></ul>
          </div>
        `;

        const participantList = activityCard.querySelector(".participant-list");
        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "participant-empty";
          emptyMessage.textContent = "No participants yet";
          participantList.appendChild(emptyMessage);
        } else {
          details.participants.forEach((participant) => {
            participantList.appendChild(createParticipantItem(name, participant));
          });
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    const unregisterButton = event.target.closest(".participant-remove");
    if (!unregisterButton) {
      return;
    }

    const participantItem = unregisterButton.closest(".participant-item");
    const activityCard = unregisterButton.closest(".activity-card");
    const email = participantItem.dataset.participantEmail;
    const activity = activityCard.dataset.activityName;
    unregisterButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      participantItem.remove();
      const participantList = activityCard.querySelector(".participant-list");
      if (participantList.querySelectorAll(".participant-item").length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.className = "participant-empty";
        emptyMessage.textContent = "No participants yet";
        participantList.appendChild(emptyMessage);
      }
      updateParticipantStats(activityCard, 1);
      showMessage(result.message, "success");
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    } finally {
      unregisterButton.disabled = false;
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
          .find((card) => card.dataset.activityName === activity);
        if (activityCard) {
          const participantList = activityCard.querySelector(".participant-list");
          const emptyMessage = participantList.querySelector(".participant-empty");
          if (emptyMessage) {
            emptyMessage.remove();
          }

          participantList.appendChild(createParticipantItem(activity, email));
          updateParticipantStats(activityCard, -1);
        }

        signupForm.reset();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
