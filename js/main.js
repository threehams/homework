'use strict';

document.addEventListener('DOMContentLoaded', function() {
  /*
   * Create a todo list isolated from other elements.
   *
   * @param rootElement  DOM element to use as the root for this component.
   */
  function TodoList(rootElement) {
    // Set up shortcuts for all elements, relative to root (cut down on repetition)
    this.root = rootElement;
    this.addForm = this.root.querySelector('.todo-add-form');
    this.addInput = this.root.querySelector('.todo-add-input');
    this.jsonError = this.root.querySelector('.todo-json-error');
    this.buttonImport = this.root.querySelector('.todo-load-json');
    this.list = this.root.querySelector('.todo-list');
    this.currentError = null;

    // Clear the JSON load error (if it exists) whenever it receives input.
    var jsonInputElement = this.root.querySelector('.todo-json-input');
    this.jsonInput = new ResizingTextarea(jsonInputElement);
    jsonInputElement.addEventListener('input', function() {
      if (this.currentError) this.displayError(null);
    }.bind(this));

    // Intercept submit events on add form
    this.addForm.addEventListener('submit', function(e) {
      e.preventDefault(); // prevent redirect to /?#
      this.add(this.addInput.value);
      this.addInput.value = '';
    }.bind(this));
    this.buttonImport.addEventListener('click', this.import.bind(this));
  }

  /*
   * Add an item to the list.
   *
   * @param text {string}    Text for the item - maximum 255 chars
   */
  TodoList.prototype.add = function(text) {
    // Stolen from http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
    // Should check against a well-tested library for use in production
    function sanitize(text) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(text));
      return div.innerHTML;
    }

    text = sanitize(text);
    if (!text || text === '') return;
    var element = document.createElement('li');
    element.className += ' todo-item'; // no support for classList in IE9
    element.innerHTML = '<span class="todo-item-text">' + text + '</span><a class="todo-item-delete" href="#">delete</a>';

    // Saving a reference to this element in the handler - it's much cleaner than parentElement.parentElement later
    // Note: May be a circular reference / memory leak
    element.querySelector('.todo-item-delete').addEventListener('click', function(event) {
      event.preventDefault();
      this.remove(element);
    }.bind(this));
    this.list.appendChild(element);
    this.export();
  };

  /*
   * Remove the given element from the todo-list and update the JSON text box.
   *
   * @param element   Element to remove
   */
  TodoList.prototype.remove = function(element) {
    element.parentElement.removeChild(element);
    this.export();
  };

  /*
   * Pull the text from the JSON input, validate, and replace the existing list.
   * Errors are
   */
  TodoList.prototype.import = function() {
    var imported = this.jsonInput.getValue();
    if (!imported) return;
    var list;
    try {
      list = JSON.parse(imported);
    } catch(e) {
      this.displayError('Could not parse JSON.');
      return;
    }
    if (!this.isValidList(list)) {
      this.displayError('Invalid format. JSON should be an array of strings.');
      return;
    }
    this.clearList();
    list.forEach(function(item) {
      this.add(item);
    }.bind(this));
  };

  /*
   * Remove each element from the list. Could also use innerHTML = '', but this works better with (possible) animations
   */
  TodoList.prototype.clearList = function() {
    [].slice.call(this.list.children).forEach(function(element) {
      this.list.removeChild(element);
    }.bind(this));
  };

  /*
   * Adds 'error' class to input box, and displays an error on the page.
   */
  TodoList.prototype.displayError = function(message) {
    if (message) {
      this.jsonError.innerHTML = '<span>' + message + '</span>';
      this.jsonError.className = this.jsonError.className.replace(/\bhide\b/g, '');
      this.currentError = message;
    } else {
      this.jsonError.innerHTML = '';
      this.jsonError.className += ' hide';
      this.currentError = null;
    }

  };

  /*
   * Validates that the given JSON is an array of strings.
   *
   * @returns true if list is valid, false if not
   */
  TodoList.prototype.isValidList = function(json) {
    for (var i = 0; i < json.length; i++) {
      if (typeof json[i] !== 'string') return false;
    }
    return true;
  };

  /*
   * Write the current contents of the list to the JSON input box.
   */
  TodoList.prototype.export = function() {
    var itemList = [].slice.call(this.list.children).map(function(element) {
      return element.querySelector('.todo-item-text').innerHTML;
    });
    // Note: built-in JSON.stringify does not escape unicode
    this.jsonInput.setValue(JSON.stringify(itemList));
    this.jsonInput.resize();
  };

  /*
   * Adds events to make a textarea element auto-resize on input event.
   *
   * @param element
   */
  function ResizingTextarea(element) {
    // Note: For some reason, IE's row calculations are off. May just be a browser bug.
    this.element = element;
    // Calculate the height of each row, allowing fast auto-resizing that doesn't break on CSS changes.
    this.baseRows = parseInt(element.getAttribute('rows'));
    var baseScrollHeight = element.scrollHeight;
    element.rows += 1;
    this.rowHeight = element.scrollHeight - baseScrollHeight;
    // Calculate the amount of space left over from padding, etc - very browser-specific
    this.padding = baseScrollHeight - (this.rowHeight * this.baseRows);
    element.rows = this.baseRows;
    element.addEventListener('input', this.resize.bind(this));
    element.addEventListener('keyup', function(event) {
      // IE doesn't fire input event on backspace or delete
      // keyup used because of timing issue with delete + keydown
      if (event.keyCode === 8 || event.keyCode === 46) this.resize();
    }.bind(this));
  }

  /*
   * Resize the element by shrinking it down, then calculating the number of rows needed.
   */
  ResizingTextarea.prototype.resize = function() {
    this.element.rows = this.baseRows;
    var extraSpace = this.element.scrollHeight - (this.element.getAttribute('rows') * this.rowHeight) - this.padding;
    var extraRows = Math.ceil(extraSpace / this.rowHeight);
    // avoid DOM mutation if nothing has changed
    if (extraRows) this.element.rows += extraRows;
  };

  ResizingTextarea.prototype.getValue = function() {
    return this.element.value;
  };

  ResizingTextarea.prototype.setValue = function(value) {
    this.element.value = value;
  };

  var element = document.querySelector('.todo');
  new TodoList(element);
});
