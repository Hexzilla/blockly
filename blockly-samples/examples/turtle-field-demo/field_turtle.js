/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A field used to customize a turtle.
 * @author bekawestberg@gmail.com (Beka Westberg)
 */
'use strict';

// You must provide the constructor for your custom field.
goog.provide('CustomFields.FieldTurtle');

// You must require the abstract field class to inherit from.
goog.require('Blockly.Field');
goog.require('Blockly.fieldRegistry');
goog.require('Blockly.utils');
goog.require('Blockly.utils.dom');
goog.require('Blockly.utils.object');
goog.require('Blockly.utils.Size');

var CustomFields = CustomFields || {};

class FieldTurtle extends Blockly.Field {
  // Since this field is editable we must also define serializable as true
  // (for backwards compatibility reasons serializable is false by default).
  SERIALIZABLE = true;

  // The cursor property defines what the mouse will look like when the user
  // hovers over the field. By default the cursor will be whatever
  // .blocklyDraggable's cursor is defined as (vis. grab). Most fields define
  // this property as 'default'.
  CURSOR = 'pointer';

  // How far to move the text to keep it to the right of the turtle.
  // May change if the turtle gets fancy enough.
  TEXT_OFFSET_X = 80;

  // Used to keep track of our editor event listeners, so they can be
  // properly disposed of when the field closes. You can keep track of your
  // listeners however you want, just be sure to dispose of them!
  editorListeners_ = [];

  // Generally field's values should be optional, and have logical defaults.
  // If this is not possible (for example image fields can't have logical
  // defaults) the field should throw a clear error when a value is not provided.
  // Editable fields also generally accept validators, so we will accept a
  // validator.
  constructor(opt_pattern, opt_hat, opt_turtleName, opt_validator) {

    // The turtle field contains an object as its value, so we need to compile
    // the parameters into an object.
    const value = {};
    value.pattern = opt_pattern || FieldTurtle.PATTERNS[0];
    value.hat = opt_hat || FieldTurtle.HATS[0];
    value.turtleName = opt_turtleName || FieldTurtle.NAMES[0];

    // A field constructor should always call its parent constructor, because
    // that helps keep the code organized and DRY.
    super(value, opt_validator);

    /**
     * The size of the area rendered by the field.
     * @type {Blockly.utils.Size}
     * @protected
     * @override
     */
    this.size_ = new Blockly.utils.Size(0, 0);
  }

  // These are the different options for our turtle. Being declared this way
  // means they are static, and not translatable. If you want to do something
  // similar, but make it translatable you should set up your options like a
  // dropdown field, with language-neutral keys and human-readable values.
  static PATTERNS =
      ['Dots', 'Stripes', 'Hexagons'];
  static HATS =
      ['Stovepipe', 'Crown', 'Propeller', 'Mask', 'Fedora'];
  static NAMES =
      ['Yertle', 'Franklin', 'Crush', 'Leonardo', 'Bowser', 'Squirtle', 'Oogway'];

  // This allows the field to be constructed using a JSON block definition.
  static fromJson(options) {
    // In this case we simply pass the JSON options along to the constructor,
    // but you can also use this to get message references, and other such things.
    return new FieldTurtle(
      options['pattern'],
      options['hat'],
      options['turtleName']);
  }

  // Used to create the DOM of our field.
  initView() {
    // Because we want to have both a borderRect_ (background) and a
    // textElement_ (text) we can call the super-function. If we only wanted
    // one or the other, we could call their individual createX functions.
    super.initView();

    // Note that the field group is created by the abstract field's init_
    // function. This means that *all elements* should be children of the
    // fieldGroup_.
    this.createView_();
  }

  // Updates how the field looks depending on if it is editable or not.
  updateEditable() {
    if (!this.fieldGroup_) {
      // Not initialized yet.
      return;
    }
    // The default functionality just makes it so the borderRect_ does not
    // highlight when hovered.
    super.updateEditable();
    // Things like this are best applied to the clickTarget_. By default the
    // click target is the same as getSvgRoot, which by default is the
    // fieldGroup_.
    const group = this.getClickTarget_();
    if (!this.isCurrentlyEditable()) {
      group.style.cursor = 'not-allowed';
    } else {
      group.style.cursor = this.CURSOR;
    }
  }

  // Gets the text to display when the block is collapsed
  getText() {
    let text = this.value_.turtleName + ' wearing a ' + this.value_.hat;
    if (this.value_.hat == 'Stovepipe' || this.value_.hat == 'Propeller') {
      text += ' hat';
    }
    return text;
  }

  // Makes sure new field values (given to setValue) are valid, meaning
  // something this field can legally "hold". Class validators can either change
  // the input value, or return null if the input value is invalid. Called by
  // the setValue() function.
  doClassValidation_(newValue) {
    // Undefined signals that we want the value to remain unchanged. This is a
    // special feature of turtle fields, but could be useful for other
    // multi-part fields.
    if (newValue.pattern == undefined) {
      newValue.pattern = this.displayValue_ && this.displayValue_.pattern;
      // We only want to allow patterns that are part of our pattern list.
      // Anything else is invalid, so we return null.
    } else if (FieldTurtle.PATTERNS.indexOf(newValue.pattern) == -1) {
      newValue.pattern = null;
    }

    if (newValue.hat == undefined) {
      newValue.hat = this.displayValue_ && this.displayValue_.hat;
    } else if (FieldTurtle.HATS.indexOf(newValue.hat) == -1) {
      newValue.hat = null;
    }

    if (newValue.turtleName == undefined) {
      newValue.turtleName = this.displayValue_ && this.displayValue_.turtleName;
    } else if (FieldTurtle.NAMES.indexOf(newValue.turtleName) == -1) {
      newValue.turtleName = null;
    }

    // This is a strategy for dealing with defaults on multi-part values.
    // The class validator sets individual properties of the object to null
    // to indicate that they are invalid, and then caches that object to the
    // cachedValidatedValue_ property. This way the field can, for
    // example, properly handle an invalid pattern, combined with a valid hat.
    // This can also be done with local validators.
    this.cachedValidatedValue_ = newValue;

    // Always be sure to return!
    if (!newValue.pattern || !newValue.hat || !newValue.turtleName) {
      return null;
    }
    return newValue;
  }

  // Saves the new field value. Called by the setValue function.
  doValueUpdate_(newValue) {
    // The default function sets this field's this.value_ property to the
    // newValue, and its this.isDirty_ property to true. The isDirty_ property
    // tells the setValue function whether the field needs to be re-rendered.
    super.doValueUpdate_(newValue);
    this.displayValue_ = newValue;
    // Since this field has custom UI for invalid values, we also want to make
    // sure it knows it is now valid.
    this.isValueInvalid_ = false;
  }

  // Notifies that the field that the new value was invalid. Called by
  // setValue function. Can either be triggered by the class validator, or the
  // local validator.
  doValueInvalid_(invalidValue) {
    // By default this function is no-op, meaning if the new value is invalid
    // the field simply won't be updated. This field has custom UI for invalid
    // values, so we override this function.
    // We want the value to be displayed like normal.
    // But we want to flag it as invalid, so the render_ function knows to
    // make the borderRect_ red.
    this.displayValue_ = invalidValue;
    this.isDirty_ = true;
    this.isValueInvalid_ = true;
  }

  // Updates the field's on-block display based on the current display value.
  render_() {
    const value = this.displayValue_;

    // Always do editor updates inside render. This makes sure the editor
    // always displays the correct value, even if a validator changes it.
    if (this.editor_) {
      this.renderEditor_();
    }

    this.stovepipe_.style.display = 'none';
    this.crown_.style.display = 'none';
    this.mask_.style.display = 'none';
    this.propeller_.style.display = 'none';
    this.fedora_.style.display = 'none';
    switch (value.hat) {
      case 'Stovepipe':
        this.stovepipe_.style.display = '';
        this.turtleGroup_.setAttribute('transform', 'translate(0,12)');
        this.textElement_.setAttribute(
          'transform', 'translate(' + this.TEXT_OFFSET_X + ',20)');
        break;
      case 'Crown':
        this.crown_.style.display = '';
        this.turtleGroup_.setAttribute('transform', 'translate(0,9)');
        this.textElement_.setAttribute(
          'transform', 'translate(' + this.TEXT_OFFSET_X + ',16)');
        break;
      case 'Mask':
        this.mask_.style.display = '';
        this.turtleGroup_.setAttribute('transform', 'translate(0,6)');
        this.textElement_.setAttribute('transform',
          'translate(' + this.TEXT_OFFSET_X + ',12)');
        break;
      case 'Propeller':
        this.propeller_.style.display = '';
        this.turtleGroup_.setAttribute('transform', 'translate(0,6)');
        this.textElement_.setAttribute('transform',
          'translate(' + this.TEXT_OFFSET_X + ',12)');
        break;
      case 'Fedora':
        this.fedora_.style.display = '';
        this.turtleGroup_.setAttribute('transform', 'translate(0,6)');
        this.textElement_.setAttribute('transform',
          'translate(' + this.TEXT_OFFSET_X + ',12)');
        break;
    }

    switch (value.pattern) {
      case 'Dots':
        this.shellPattern_.setAttribute('fill', 'url(#polkadots)');
        break;
      case 'Stripes':
        this.shellPattern_.setAttribute('fill', 'url(#stripes)');
        break;
      case 'Hexagons':
        this.shellPattern_.setAttribute('fill', 'url(#hexagons)');
        break;
    }

    // Always modify the textContent_ rather than the textElement_. This
    // allows fields to append DOM to the textElement (e.g. the angle field).
    this.textContent_.nodeValue = value.turtleName;

    if (this.isValueInvalid_) {
      this.borderRect_.style.fill = '#f99';
      this.borderRect_.style.fillOpacity = 1;
    } else {
      this.borderRect_.style.fill = '#fff';
      this.borderRect_.style.fillOpacity = 0.6;
    }

    this.updateSize_();
  }

  renderEditor_() {
    const value = this.displayValue_;

    // .textElement is a property assigned to the element.
    // It allows the text to be edited without destroying the warning icon.
    this.editor_.patternText.textElement.nodeValue = value.pattern;
    this.editor_.hatText.textElement.nodeValue = value.hat;
    this.editor_.turtleNameText.textElement.nodeValue = value.turtleName;

    this.editor_.patternText.warningIcon.style.display =
      this.cachedValidatedValue_.pattern ? 'none' : '';
    this.editor_.hatText.warningIcon.style.display =
      this.cachedValidatedValue_.hat ? 'none' : '';
    this.editor_.turtleNameText.warningIcon.style.display =
      this.cachedValidatedValue_.turtleName ? 'none' : '';
  }

  // Used to update the size of the field. This function's logic could be simply
  // included inside render_ (it is not called anywhere else), but it is
  // usually separated to keep code more organized.
  updateSize_() {
    const bbox = this.movableGroup_.getBBox();
    let width = bbox.width;
    let height = bbox.height;
    if (this.borderRect_) {
      width += this.constants_.FIELD_BORDER_RECT_X_PADDING * 2;
      height += this.constants_.FIELD_BORDER_RECT_X_PADDING * 2;
      this.borderRect_.setAttribute('width', width);
      this.borderRect_.setAttribute('height', height);
    }
    // Note how both the width and the height can be dynamic.
    this.size_.width = width;
    this.size_.height = height;
  }
  // Called when the field is clicked. It is usually used to show an editor,
  // but it can also be used for other things e.g. the checkbox field uses
  // this function to check/uncheck itself.
  showEditor_() {
    this.editor_ = this.dropdownCreate_();
    this.renderEditor_();
    Blockly.DropDownDiv.getContentDiv().appendChild(this.editor_);

    // These allow us to have the editor match the block's colour.
    const fillColour = this.sourceBlock_.getColour();
    Blockly.DropDownDiv.setColour(fillColour,
      this.sourceBlock_.style.colourTertiary);

    // Always pass the dropdown div a dispose function so that you can clean
    // up event listeners when the editor closes.
    Blockly.DropDownDiv.showPositionedByField(
      this, this.dropdownDispose_.bind(this));
  }

  // Creates the UI of the editor, and adds event listeners to it.
  dropdownCreate_() {
    const createRow = function (table) {
      const row = table.appendChild(document.createElement('tr'));
      row.className = 'row';
      return row;
    };
    const createLeftArrow = function (row) {
      const cell = document.createElement('div');
      cell.className = 'arrow';
      const leftArrow = document.createElement('button');
      leftArrow.setAttribute('type', 'button');
      leftArrow.textContent = '<';
      cell.appendChild(leftArrow);
      row.appendChild(cell);
      return cell;
    };
    const createTextNode = function (row, text) {
      const cell = document.createElement('div');
      cell.className = 'text';
      const textElem = document.createTextNode(text);
      cell.appendChild(textElem);
      cell.textElement = textElem;
      const warning = document.createElement('img');
      warning.setAttribute('src', 'media/warning.svg');
      warning.setAttribute('height', '16px');
      warning.setAttribute('width', '16px');
      warning.style.marginLeft = '4px';
      cell.appendChild(warning);
      cell.warningIcon = warning;
      row.appendChild(cell);
      return cell;
    };
    const createRightArrow = function (row) {
      const cell = document.createElement('div');
      cell.className = 'arrow';
      const rightArrow = document.createElement('button');
      rightArrow.setAttribute('type', 'button');
      rightArrow.textContent = '>';
      cell.appendChild(rightArrow);
      row.appendChild(cell);
      return cell;
    };
    const createArrowListener = function (variable, array, direction) {
      return function () {
        let currentIndex = array.indexOf(this.displayValue_[variable]);
        currentIndex += direction;
        if (currentIndex <= -1) {
          currentIndex = array.length - 1;
        } else if (currentIndex >= array.length) {
          currentIndex = 0;
        }
        const value = {};
        value[variable] = array[currentIndex];
        this.setValue(value);
      };
    };

    const widget = document.createElement('div');
    widget.className = 'customFieldsTurtleWidget blocklyNonSelectable';

    const table = document.createElement('div');
    table.className = 'table';
    widget.appendChild(table);

    let row = createRow(table);
    let leftArrow = createLeftArrow(row);
    widget.patternText = createTextNode(row, this.displayValue_.pattern);
    let rightArrow = createRightArrow(row);
    this.editorListeners_.push(Blockly.browserEvents.bind(leftArrow, 'mouseup', this,
      createArrowListener('pattern', FieldTurtle.PATTERNS, -1)));
    this.editorListeners_.push(Blockly.browserEvents.bind(rightArrow, 'mouseup', this,
      createArrowListener('pattern', FieldTurtle.PATTERNS, 1)));

    row = createRow(table);
    leftArrow = createLeftArrow(row);
    widget.hatText = createTextNode(row, this.displayValue_.hat);
    rightArrow = createRightArrow(row);
    this.editorListeners_.push(Blockly.browserEvents.bind(leftArrow, 'mouseup', this,
      createArrowListener('hat', FieldTurtle.HATS, -1)));
    this.editorListeners_.push(Blockly.browserEvents.bind(rightArrow, 'mouseup', this,
      createArrowListener('hat', FieldTurtle.HATS, 1)));

    row = createRow(table);
    leftArrow = createLeftArrow(row);
    widget.turtleNameText = createTextNode(row, this.displayValue_.turtleName);
    rightArrow = createRightArrow(row);
    this.editorListeners_.push(Blockly.browserEvents.bind(leftArrow, 'mouseup', this,
      createArrowListener('turtleName', FieldTurtle.NAMES, -1)));
    this.editorListeners_.push(Blockly.browserEvents.bind(rightArrow, 'mouseup', this,
      createArrowListener('turtleName', FieldTurtle.NAMES, 1)));

    const randomizeButton = document.createElement('button');
    randomizeButton.className = 'randomize';
    randomizeButton.setAttribute('type', 'button');
    randomizeButton.textContent = 'randomize turtle';
    this.editorListeners_.push(Blockly.browserEvents.bind(randomizeButton, 'mouseup', this,
      function () {
        const value = {};
        value.pattern = FieldTurtle.PATTERNS[Math.floor(Math.random() * FieldTurtle.PATTERNS.length)];

        value.hat = FieldTurtle.HATS[Math.floor(Math.random() * FieldTurtle.HATS.length)];

        value.turtleName = FieldTurtle.NAMES[Math.floor(Math.random() * FieldTurtle.NAMES.length)];

        this.setValue(value);
      }));
    widget.appendChild(randomizeButton);

    return widget;
  }

  // Cleans up any event listeners that were attached to the now hidden editor.
  dropdownDispose_() {
    for (let i = this.editorListeners_.length, listener; listener = this.editorListeners_[i]; i--) {
      Blockly.browserEvents.unbind(listener);
      this.editorListeners_.pop();
    }
  }

  // Updates the field's colour based on the colour of the block. Called by
  // block.applyColour.
  applyColour() {
    if (!this.sourceBlock_) {
      return;
    }
    // The getColourX functions are the best way to access the colours of a block.
    const isShadow = this.sourceBlock_.isShadow();
    const fillColour = isShadow ?
      this.sourceBlock_.style.colourSecondary : this.sourceBlock_.getColour();
    // This is technically a package function, meaning it could change.
    const borderColour = isShadow ? fillColour :
      this.sourceBlock_.style.colourTertiary;

    if (this.turtleGroup_) {
      let child = this.turtleGroup_.firstChild;
      while (child) {
        // If it is a text node, continue.
        if (child.nodeType == 3) {
          child = child.nextSibling;
          continue;
        }
        // Or if it is a non-turtle node, continue.
        const className = child.getAttribute('class');
        if (!className || className.indexOf('turtleBody') == -1) {
          child = child.nextSibling;
          continue;
        }

        child.style.fill = fillColour;
        child.style.stroke = borderColour;
        child = child.nextSibling;
      }
    }
  }

  // Saves the field's value to an XML node. Allows for custom serialization.
  toXml(fieldElement) {
    // The default implementation of this function creates a node that looks
    // like this: (where value is returned by getValue())
    // <field name="FIELDNAME">value</field>
    // But this doesn't work for our field because it stores an /object/.
    fieldElement.setAttribute('pattern', this.value_.pattern);
    fieldElement.setAttribute('hat', this.value_.hat);
    // The textContent usually contains whatever is closest to the field's
    // 'value'. The textContent doesn't need to contain anything, but saving
    // something to it does aid in readability.
    fieldElement.textContent = this.value_.turtleName;

    // Always return the element!
    return fieldElement;
  }
  // Sets the field's value based on an XML node. Allows for custom
  // de-serialization.
  fromXml(fieldElement) {
    // Because we had to do custom serialization for this field, we also need
    // to do custom de-serialization.
    const value = {};
    value.pattern = fieldElement.getAttribute('pattern');
    value.hat = fieldElement.getAttribute('hat');
    value.turtleName = fieldElement.textContent;
    // The end goal is to call this.setValue()
    this.setValue(value);
  }
  
  // Called by initView to create all of the SVGs. This is just used to keep
  // the code more organized.
  createView_() {
    this.movableGroup_ = Blockly.utils.dom.createSvgElement('g',
      {
        'transform': 'translate(0,5)'
      }, this.fieldGroup_);
    const scaleGroup = Blockly.utils.dom.createSvgElement('g',
      {
        'transform': 'scale(1.5)'
      }, this.movableGroup_);
    this.turtleGroup_ = Blockly.utils.dom.createSvgElement('g',
      {
        // Makes the smaller turtle graphic align with the hats.
        'class': 'turtleBody'
      }, scaleGroup);
    const tail = Blockly.utils.dom.createSvgElement('path',
      {
        'class': 'turtleBody',
        'd': 'M7,27.5H0.188c3.959-2,6.547-2.708,8.776-5.237',
        'transform': 'translate(0.312 -12.994)'
      }, this.turtleGroup_);
    const legLeft = Blockly.utils.dom.createSvgElement('rect',
      {
        'class': 'turtleBody',
        'x': 8.812,
        'y': 12.506,
        'width': 4,
        'height': 10
      }, this.turtleGroup_);
    const legRight = Blockly.utils.dom.createSvgElement('rect',
      {
        'class': 'turtleBody',
        'x': 28.812,
        'y': 12.506,
        'width': 4,
        'height': 10
      }, this.turtleGroup_);
    const head = Blockly.utils.dom.createSvgElement('path',
      {
        'class': 'turtleBody',
        'd': 'M47.991,17.884c0,1.92-2.144,3.477-4.788,3.477a6.262,6.262,0,0,1-2.212-.392c-0.2-.077-1.995,2.343-4.866,3.112a17.019,17.019,0,0,1-6.01.588c-4.413-.053-2.5-3.412-2.745-3.819-0.147-.242,2.232.144,6.126-0.376a7.392,7.392,0,0,0,4.919-2.588c0-1.92,2.144-3.477,4.788-3.477S47.991,15.964,47.991,17.884Z',
        'transform': 'translate(0.312 -12.994)'
      }, this.turtleGroup_);
    const smile = Blockly.utils.dom.createSvgElement('path',
      {
        'class': 'turtleBody',
        'd': 'M42.223,18.668a3.614,3.614,0,0,0,2.728,2.38',
        'transform': 'translate(0.312 -12.994)'
      }, this.turtleGroup_);
    const sclera = Blockly.utils.dom.createSvgElement('ellipse',
      {
        'cx': 43.435,
        'cy': 2.61,
        'rx': 2.247,
        'ry': 2.61,
        'fill': '#fff'
      }, this.turtleGroup_);
    const pupil = Blockly.utils.dom.createSvgElement('ellipse',
      {
        'cx': 44.166,
        'cy': 3.403,
        'rx': 1.318,
        'ry': 1.62
      }, this.turtleGroup_);
    const shell = Blockly.utils.dom.createSvgElement('path',
      {
        'class': 'turtleBody',
        'd': 'M33.4,27.5H7.193c0-6,5.866-13.021,13.1-13.021S33.4,21.5,33.4,27.5Z',
        'transform': 'translate(0.312 -12.994)'
      }, this.turtleGroup_);
    this.shellPattern_ = Blockly.utils.dom.createSvgElement('path',
      {
        'd': 'M33.4,27.5H7.193c0-6,5.866-13.021,13.1-13.021S33.4,21.5,33.4,27.5Z',
        'transform': 'translate(0.312 -12.994)'
      }, this.turtleGroup_);

    this.stovepipe_ = Blockly.utils.dom.createSvgElement('image',
      {
        'width': '50',
        'height': '18'
      }, scaleGroup);
    this.stovepipe_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
      'media/stovepipe.svg');
    this.crown_ = Blockly.utils.dom.createSvgElement('image',
      {
        'width': '50',
        'height': '15'
      }, scaleGroup);
    this.crown_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
      'media/crown.svg');
    this.mask_ = Blockly.utils.dom.createSvgElement('image',
      {
        'width': '50',
        'height': '24'
      }, scaleGroup);
    this.mask_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
      'media/mask.svg');
    this.propeller_ = Blockly.utils.dom.createSvgElement('image',
      {
        'width': '50',
        'height': '11'
      }, scaleGroup);
    this.propeller_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
      'media/propeller.svg');
    this.fedora_ = Blockly.utils.dom.createSvgElement('image',
      {
        'width': '50',
        'height': '12'
      }, scaleGroup);
    this.fedora_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
      'media/fedora.svg');

    // Even if we're not going to display it right away, we want to create all
    // of our DOM elements inside this function.
    this.crown_.style.display = 'none';
    this.mask_.style.display = 'none';
    this.propeller_.style.display = 'none';
    this.fedora_.style.display = 'none';

    this.movableGroup_.appendChild(this.textElement_);
    this.textElement_.setAttribute(
      'transform', 'translate(' + this.TEXT_OFFSET_X + ',20)');

    this.defs_ = Blockly.utils.dom.createSvgElement('defs', {}, this.fieldGroup_);
    this.polkadotPattern_ = Blockly.utils.dom.createSvgElement('pattern',
      {
        'id': 'polkadots',
        'patternUnits': 'userSpaceOnUse',
        'width': 10,
        'height': 10
      }, this.defs_);
    this.polkadotGroup_ = Blockly.utils.dom.createSvgElement(
      'g', {}, this.polkadotPattern_);
    Blockly.utils.dom.createSvgElement('circle',
      {
        'cx': 2.5,
        'cy': 2.5,
        'r': 2.5,
        'fill': '#000',
        'fill-opacity': .3
      }, this.polkadotGroup_);
    Blockly.utils.dom.createSvgElement('circle',
      {
        'cx': 7.5,
        'cy': 7.5,
        'r': 2.5,
        'fill': '#000',
        'fill-opacity': .3
      }, this.polkadotGroup_);

    this.hexagonPattern_ = Blockly.utils.dom.createSvgElement('pattern',
      {
        'id': 'hexagons',
        'patternUnits': 'userSpaceOnUse',
        'width': 10,
        'height': 8.68,
        'patternTransform': 'translate(2) rotate(45)'
      }, this.defs_);
    Blockly.utils.dom.createSvgElement('polygon',
      {
        'id': 'hex',
        'points': '4.96,4.4 7.46,5.84 7.46,8.74 4.96,10.18 2.46,8.74 2.46,5.84',
        'stroke': '#000',
        'stroke-opacity': .3,
        'fill-opacity': 0
      }, this.hexagonPattern_);
    let use = Blockly.utils.dom.createSvgElement('use',
      {
        'x': 5,
      }, this.hexagonPattern_);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#hex');
    use = Blockly.utils.dom.createSvgElement('use',
      {
        'x': -5,
      }, this.hexagonPattern_);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#hex');
    use = Blockly.utils.dom.createSvgElement('use',
      {
        'x': 2.5,
        'y': -4.34
      }, this.hexagonPattern_);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#hex');
    use = Blockly.utils.dom.createSvgElement('use',
      {
        'x': -2.5,
        'y': -4.34
      }, this.hexagonPattern_);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#hex');

    this.stripesPattern_ = Blockly.utils.dom.createSvgElement('pattern',
      {
        'id': 'stripes',
        'patternUnits': 'userSpaceOnUse',
        'width': 5,
        'height': 10,
        'patternTransform': 'rotate(45)'
      }, this.defs_);
    Blockly.utils.dom.createSvgElement('line',
      {
        'x1': 0,
        'y1': 0,
        'x2': 0,
        'y2': 10,
        'stroke-width': 4,
        'stroke': '#000',
        'stroke-opacity': .3
      }, this.stripesPattern_);
  }
}

// Blockly needs to know the JSON name of this field. Usually this is
// registered at the bottom of the field class.
Blockly.fieldRegistry.register('field_turtle', FieldTurtle);

CustomFields.FieldTurtle = FieldTurtle;