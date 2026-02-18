document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to avoid duplicated options on refresh
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;
        // store max participants and activity name for later UI updates
        activityCard.dataset.maxParticipants = details.max_participants;
        activityCard.dataset.activityName = name;

        // Participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const participantsTitle = document.createElement("p");
        participantsTitle.innerHTML = "<strong>Participants:</strong>";
        participantsDiv.appendChild(participantsTitle);

        const ul = document.createElement("ul");
        ul.className = "participants-list";

        if (!details.participants || details.participants.length === 0) {
          const none = document.createElement("li");
          none.textContent = "No participants yet";
          none.className = "none";
          ul.appendChild(none);
        } else {
          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const span = document.createElement("span");
            span.textContent = p;

            const btn = document.createElement("button");
            btn.className = "participant-delete";
            btn.title = "Unregister participant";
            btn.ariaLabel = "Unregister participant";
            btn.textContent = "✖";
            btn.dataset.activity = name;
            btn.dataset.email = p;

            // Delete handler
            btn.addEventListener("click", async (e) => {
              e.preventDefault();
              btn.disabled = true;
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                if (res.ok) {
                  // remove list item
                  li.remove();

                  // if no remaining participants, show 'No participants yet'
                  const remaining = ul.querySelectorAll("li:not(.none)").length;
                  if (remaining === 0) {
                    const none = document.createElement("li");
                    none.textContent = "No participants yet";
                    none.className = "none";
                    ul.appendChild(none);
                  }

                  // update availability display
                  const max = parseInt(activityCard.dataset.maxParticipants, 10) || 0;
                  const participantsCount = ul.querySelectorAll("li:not(.none)").length;
                  const newSpots = max - participantsCount;
                  const avail = activityCard.querySelector(".availability");
                  if (avail) {
                    avail.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
                  }
                } else {
                  console.error("Failed to unregister", await res.text());
                  btn.disabled = false;
                }
              } catch (err) {
                console.error("Error unregistering participant:", err);
                btn.disabled = false;
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });
        }

        participantsDiv.appendChild(ul);

        activitiesList.appendChild(activityCard);
        activityCard.appendChild(participantsDiv);

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
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Update UI immediately: find the activity card and append the new participant
        const activityName = activity;
        // find card by dataset or by header text as fallback
        let card = activitiesList.querySelector(`[data-activity-name="${activityName}"]`);
        if (!card) {
          // fallback: match by h4 text
          const cards = activitiesList.querySelectorAll('.activity-card');
          cards.forEach((c) => {
            const h = c.querySelector('h4');
            if (h && h.textContent === activityName) card = c;
          });
        }

        if (card) {
          const ul = card.querySelector('.participants-list');
          if (ul) {
            // remove 'No participants yet' if present
            const none = ul.querySelector('li.none');
            if (none) none.remove();

            // create new list item with delete button
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = email;

            const btn = document.createElement('button');
            btn.className = 'participant-delete';
            btn.title = 'Unregister participant';
            btn.ariaLabel = 'Unregister participant';
            btn.textContent = '✖';
            btn.dataset.activity = activityName;
            btn.dataset.email = email;

            // attach same delete handler as used during initial render
            btn.addEventListener('click', async (e) => {
              e.preventDefault();
              btn.disabled = true;
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
                  { method: 'DELETE' }
                );
                if (res.ok) {
                  li.remove();
                  const remaining = ul.querySelectorAll('li:not(.none)').length;
                  if (remaining === 0) {
                    const none2 = document.createElement('li');
                    none2.textContent = 'No participants yet';
                    none2.className = 'none';
                    ul.appendChild(none2);
                  }
                  const max = parseInt(card.dataset.maxParticipants, 10) || 0;
                  const participantsCount = ul.querySelectorAll('li:not(.none)').length;
                  const newSpots = max - participantsCount;
                  const avail = card.querySelector('.availability');
                  if (avail) avail.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
                } else {
                  console.error('Failed to unregister', await res.text());
                  btn.disabled = false;
                }
              } catch (err) {
                console.error('Error unregistering participant:', err);
                btn.disabled = false;
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);

            // update availability display
            const max = parseInt(card.dataset.maxParticipants, 10) || 0;
            const participantsCount = ul.querySelectorAll('li:not(.none)').length;
            const newSpots = max - participantsCount;
            const avail = card.querySelector('.availability');
            if (avail) avail.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
