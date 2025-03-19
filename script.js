document.addEventListener("DOMContentLoaded", function () {
    const textInput = document.querySelector(".text-input");
    const addButton = document.querySelector(".add-button");
    const clearButton = document.querySelector(".clear-button");
    const textDisplay = document.querySelector(".text-display");
    const colorOptions = document.querySelectorAll(".color-option");

    let selectedColor = "#000000";
    let selectedChars = new Set();
    let isDragging = false;
    let dragStartChar = null;
    let startX, startY, offsetX, offsetY;
    let selectionBox = null;
    let isSelecting = false;
    let ghostElement = null;
    let targetChar = null;
    let targetChars = new Set(); 
    let lineCounter = 0;
    let targetLine = null;
    let insertPosition = null; 
    let insertBefore = null; 
    let operationMode = "swap"; 

    addButton.addEventListener("click", function () {
      const text = textInput.value.trim();
      if (text) {
        addTextLine(text);
        textInput.value = "";
      }
    });

    clearButton.addEventListener("click", function () {
      textDisplay.innerHTML = "";
      lineCounter = 0;
    });

    textInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        addButton.click();
      }
    });

    colorOptions.forEach((option) => {
      option.addEventListener("click", function () {
        selectedColor = this.getAttribute("data-color");
        colorOptions.forEach(
          (opt) => (opt.style.border = "1px solid #999")
        );
        this.style.border = "2px solid #333";

        selectedChars.forEach((char) => {
          char.style.color = selectedColor;
        });
      });
    });

    function addTextLine(text) {
      const lineDiv = document.createElement("div");
      lineDiv.className = "text-line";
      lineDiv.dataset.lineId = lineCounter++;

      if (text.length === 0) {
        text = " ";
      }

      for (let i = 0; i < text.length; i++) {
        const charSpan = document.createElement("span");
        charSpan.className = "char";
        charSpan.textContent = text[i];
        charSpan.dataset.lineId = lineDiv.dataset.lineId;

        charSpan.addEventListener("mousedown", function (e) {
          if (e.ctrlKey) {
            toggleCharSelection(this);
          } else {
            if (selectedChars.has(this)) {
              dragStartChar = this;

              startX = e.clientX;
              startY = e.clientY;

              createGhostElement();

              isDragging = true;
            } else {
              clearSelection();
              toggleCharSelection(this);

              dragStartChar = this;
              startX = e.clientX;
              startY = e.clientY;

              createGhostElement();

              isDragging = true;
            }
          }
          e.preventDefault();
        });

        lineDiv.appendChild(charSpan);
      }

      lineDiv.addEventListener("mouseenter", function () {
        if (isDragging) {
          if (targetLine) {
            targetLine.classList.remove("target-line");
          }
          targetLine = this;
          this.classList.add("target-line");
        }
      });

      lineDiv.addEventListener("mouseleave", function () {
        if (isDragging && this === targetLine) {
          this.classList.remove("target-line");
          targetLine = null;

          if (insertPosition) {
            insertPosition.remove();
            insertPosition = null;
          }
        }
      });

      textDisplay.appendChild(lineDiv);

      if (lineCounter === 1) {
        initDragAndDrop();
        initSelectionBox();
      }
    }

    function toggleCharSelection(char) {
      if (selectedChars.has(char)) {
        selectedChars.delete(char);
        char.classList.remove("selected");
      } else {
        selectedChars.add(char);
        char.classList.add("selected");
      }
    }

    function clearSelection() {
      selectedChars.forEach((char) => {
        char.classList.remove("selected");
      });
      selectedChars.clear();
    }

    function clearTargets() {
      targetChars.forEach((char) => {
        char.classList.remove("target");
      });
      targetChars.clear();
      targetChar = null;

      if (targetLine) {
        targetLine.classList.remove("target-line");
        targetLine = null;
      }

      if (insertPosition) {
        insertPosition.remove();
        insertPosition = null;
      }

      insertBefore = null;
    }

    function createGhostElement() {
      if (ghostElement) {
        document.body.removeChild(ghostElement);
      }

      ghostElement = document.createElement("div");
      ghostElement.className = "ghost-chars";

      selectedChars.forEach((char) => {
        const clone = char.cloneNode(true);
        clone.style.display = "inline-block";
        ghostElement.appendChild(clone);
      });

      document.body.appendChild(ghostElement);

      const firstChar = dragStartChar || Array.from(selectedChars)[0];
      const rect = firstChar.getBoundingClientRect();
      ghostElement.style.left = rect.left + "px";
      ghostElement.style.top = rect.top + "px";

      offsetX = startX - rect.left;
      offsetY = startY - rect.top;
    }

    function initDragAndDrop() {
      document.addEventListener("mousemove", function (e) {
        if (isDragging && ghostElement) {
          ghostElement.style.left = e.clientX - offsetX + "px";
          ghostElement.style.top = e.clientY - offsetY + "px";

          clearTargets();

          const elementUnderCursor = document.elementFromPoint(
            e.clientX,
            e.clientY
          );

          operationMode = e.shiftKey ? "move" : "swap";

          if (
            operationMode === "swap" &&
            elementUnderCursor &&
            elementUnderCursor.classList.contains("char") &&
            !selectedChars.has(elementUnderCursor)
          ) {
            targetChar = elementUnderCursor;

            const selectedCount = selectedChars.size;
            if (selectedCount > 0) {
              let current = targetChar;
              targetChars.add(current);
              current.classList.add("target");

              for (let i = 1; i < selectedCount; i++) {
                current = current.nextSibling;
                if (
                  current &&
                  current.classList.contains("char") &&
                  !selectedChars.has(current)
                ) {
                  targetChars.add(current);
                  current.classList.add("target");
                } else {
                  break;
                }
              }
            }
          }
          else if (operationMode === "move") {
            let targetElement = elementUnderCursor;
            while (
              targetElement &&
              !targetElement.classList.contains("text-line")
            ) {
              targetElement = targetElement.parentElement;
              if (targetElement === textDisplay) break;
            }

            if (
              targetElement &&
              targetElement.classList.contains("text-line")
            ) {
              targetLine = targetElement;
              targetLine.classList.add("target-line");

              if (elementUnderCursor.classList.contains("char")) {
                const rect = elementUnderCursor.getBoundingClientRect();
                const mouseX = e.clientX;

                if (mouseX < rect.left + rect.width / 2) {
                  insertBefore = elementUnderCursor;
                } else {
                  insertBefore = elementUnderCursor.nextSibling;
                }
              } else {
                insertBefore = null;
              }

              if (insertPosition) {
                insertPosition.remove();
              }

              insertPosition = document.createElement("span");
              insertPosition.className = "insert-position";

              if (insertBefore) {
                targetLine.insertBefore(insertPosition, insertBefore);
              } else {
                targetLine.appendChild(insertPosition);
              }
            }
          }
        }
      });

      document.addEventListener("mouseup", function () {
        if (isDragging) {
          isDragging = false;

          if (operationMode === "swap" && targetChar) {
            performSwap();
          } else if (operationMode === "move" && targetLine) {
            performMove();
          }

          clearTargets();

          if (ghostElement) {
            document.body.removeChild(ghostElement);
            ghostElement = null;
          }
        }
      });
    }

    function performSwap() {
      const selectedArray = Array.from(selectedChars);

      if (selectedArray.length === 1) {
        const temp = selectedArray[0].textContent;
        const tempColor = selectedArray[0].style.color;

        selectedArray[0].textContent = targetChar.textContent;
        selectedArray[0].style.color = targetChar.style.color;

        targetChar.textContent = temp;
        targetChar.style.color = tempColor;
      } else if (selectedArray.length > 1) {
        let currentChar = targetChar;
        let nextChar = currentChar.nextSibling;

        const selectedContents = selectedArray.map(
          (char) => char.textContent
        );
        const selectedColors = selectedArray.map(
          (char) => char.style.color
        );

        const targetContents = [targetChar.textContent];
        const targetColors = [targetChar.style.color];

        for (let i = 1; i < selectedContents.length; i++) {
          if (nextChar && nextChar.classList.contains("char")) {
            targetContents.push(nextChar.textContent);
            targetColors.push(nextChar.style.color);
            nextChar = nextChar.nextSibling;
          } else {
            targetContents.push("");
            targetColors.push("");
          }
        }

        currentChar = targetChar;
        for (let i = 0; i < selectedContents.length; i++) {
          if (currentChar && currentChar.classList.contains("char")) {
            currentChar.textContent = selectedContents[i];
            currentChar.style.color = selectedColors[i];

            if (i < selectedContents.length - 1) {
              currentChar = currentChar.nextSibling;
              if (!currentChar || !currentChar.classList.contains("char")) {
                const newChar = document.createElement("span");
                newChar.className = "char";
                newChar.dataset.lineId = targetChar.dataset.lineId;

                newChar.addEventListener("mousedown", function (e) {
                  if (e.ctrlKey) {
                    toggleCharSelection(this);
                  } else {
                    if (selectedChars.has(this)) {
                      dragStartChar = this;
                      startX = e.clientX;
                      startY = e.clientY;
                      createGhostElement();
                      isDragging = true;
                    } else {
                      clearSelection();
                      toggleCharSelection(this);
                      dragStartChar = this;
                      startX = e.clientX;
                      startY = e.clientY;
                      createGhostElement();
                      isDragging = true;
                    }
                  }
                  e.preventDefault();
                });

                if (currentChar && currentChar.parentNode) {
                  currentChar.parentNode.insertBefore(
                    newChar,
                    currentChar.nextSibling
                  );
                } else {
                  const lineDiv = document.querySelector(
                    `.text-line[data-line-id="${targetChar.dataset.lineId}"]`
                  );
                  if (lineDiv) {
                    lineDiv.appendChild(newChar);
                  }
                }
                currentChar = newChar;
              }
            }
          }
        }

        for (let i = 0; i < selectedArray.length; i++) {
          if (i < targetContents.length && targetContents[i]) {
            selectedArray[i].textContent = targetContents[i];
            selectedArray[i].style.color = targetColors[i];
          }
        }
      }
    }

    function performMove() {
      const selectedArray = Array.from(selectedChars);

      selectedArray.forEach((char) => {
        const newChar = document.createElement("span");
        newChar.className = "char";
        newChar.textContent = char.textContent;
        newChar.style.color = char.style.color;
        newChar.dataset.lineId = targetLine.dataset.lineId;

        newChar.addEventListener("mousedown", function (e) {
          if (e.ctrlKey) {
            toggleCharSelection(this);
          } else {
            if (selectedChars.has(this)) {
              dragStartChar = this;
              startX = e.clientX;
              startY = e.clientY;
              createGhostElement();
              isDragging = true;
            } else {
              clearSelection();
              toggleCharSelection(this);
              dragStartChar = this;
              startX = e.clientX;
              startY = e.clientY;
              createGhostElement();
              isDragging = true;
            }
          }
          e.preventDefault();
        });

        if (insertBefore) {
          targetLine.insertBefore(newChar, insertBefore);
        } else {
          targetLine.appendChild(newChar);
        }
      });

      let shouldRemoveOriginals = true;

      for (const char of selectedArray) {
        if (char.dataset.lineId === targetLine.dataset.lineId) {
          shouldRemoveOriginals = false;
          break;
        }
      }

      if (shouldRemoveOriginals) {
        selectedArray.forEach((char) => {
          char.parentNode.removeChild(char);
        });
      } else {
        clearSelection();
      }
    }

    function initSelectionBox() {
      selectionBox = document.createElement("div");
      selectionBox.className = "selection-box";
      selectionBox.style.display = "none";
      textDisplay.appendChild(selectionBox);

      textDisplay.addEventListener("mousedown", function (e) {
        if (
          e.target === textDisplay ||
          e.target.classList.contains("text-line")
        ) {
          clearSelection();
          isSelecting = true;
          startX = e.pageX - textDisplay.getBoundingClientRect().left;
          startY = e.pageY - textDisplay.getBoundingClientRect().top;

          selectionBox.style.left = startX + "px";
          selectionBox.style.top = startY + "px";
          selectionBox.style.width = "0";
          selectionBox.style.height = "0";
          selectionBox.style.display = "block";
        }
      });

      textDisplay.addEventListener("mousemove", function (e) {
        if (isSelecting) {
          const currentX =
            e.pageX - textDisplay.getBoundingClientRect().left;
          const currentY =
            e.pageY - textDisplay.getBoundingClientRect().top;

          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);

          selectionBox.style.left = Math.min(startX, currentX) + "px";
          selectionBox.style.top = Math.min(startY, currentY) + "px";
          selectionBox.style.width = width + "px";
          selectionBox.style.height = height + "px";

          selectCharsInBox(
            Math.min(startX, currentX),
            Math.min(startY, currentY),
            width,
            height
          );
        }
      });

      textDisplay.addEventListener("mouseup", function () {
        if (isSelecting) {
          isSelecting = false;
          selectionBox.style.display = "none";
        }
      });

      textDisplay.addEventListener("mouseleave", function () {
        if (isSelecting) {
          isSelecting = false;
          selectionBox.style.display = "none";
        }
      });
    }

    function selectCharsInBox(left, top, width, height) {
      const chars = textDisplay.querySelectorAll(".char");

      chars.forEach((char) => {
        const charRect = char.getBoundingClientRect();
        const displayRect = textDisplay.getBoundingClientRect();

        const charLeft = charRect.left - displayRect.left;
        const charTop = charRect.top - displayRect.top;
        const charRight = charLeft + charRect.width;
        const charBottom = charTop + charRect.height;

        if (
          charLeft < left + width &&
          charRight > left &&
          charTop < top + height &&
          charBottom > top
        ) {
          if (!selectedChars.has(char)) {
            toggleCharSelection(char);
          }
        } else if (selectedChars.has(char)) {
          toggleCharSelection(char);
        }
      });
    }
  });