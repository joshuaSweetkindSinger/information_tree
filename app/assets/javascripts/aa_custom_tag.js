// ============================================================================
//                         Custom Tag Definition
// ============================================================================
/*
 HTML5 establishes a protocol for the creation of custom elements, which enhance DOM functionality by allowing the creation
 of new html tag types. These new html tag objects have all the standard
 html tag object methods and properties, but in addition they can have new methods and member
 variables as supplied by the programmer. In order to better support use of custom elements, we slap a lightweight framework
 on top of the HTML5 protocol and define the function defCustomTag() below.

 Using defCustomTag extends the html tag system so that the browser will understand
 new tags with names like <my-widget> in .html files. The browser will create <my-widget>
 objects referenced in any html file by calling its associated createdCallback() method, passing it 0 args. (The createdCallback() method
 is part of the HTML5 protocol, not a framework enhancement.) Custom tags created in this way are said to be statically created,
 because they were referenced by an .html file, as opposed to a javascript call. Tags created through javascript are said to be
 dynamically or programmatically created.

 Use defCustomTag() to define a new custom tag class, associated with a new custom
 html tag type.  The function defCustomTag() returns a constructor object that you can
 use to programmatically create new instances of this class. This works only for programmatic creation. The constructor
 returned by defCustomTag is *not* part of the call chain for statically created tags.

 Below is an example that extends the functionality of the native <button> tag. Note the following important things: the name of the new tag must be hyphenated;
 You must supply the proper parent class, in this case HTMLButton (this is part of HTML5, not part of the framework), AND you must supply the proper tag name
 that is being extended, in this case <button>. Note also that extending any base dom class *other* than HTMLElement does not seem to
 result in the creation of a new tag type. Here, since we are using HTMLButton as the dom base class, we do not actually create a new
 tag called <my-button>. Instead, we have to instantiate MyButton elements using <button is="my-button"> if we wish to do static creation.


 var MyButton = defCustomTag('my-button', HTMLButton, 'button') # Define a constructor for the new tag.

 # This method initializes all newly created tags, whether statically or dynamically created.
 MyButton.prototype.onCreate = function() {
   this.clicked = false
   this.onclick = function() {
     this.clicked = true
     window.master.doDefaultClickThing()
   }
 }

 # This method further initializes programmatically created tags only.
 MyButton.prototype.afterCreate = function(clickFun) {
   this.onclick = function() {
     this.clicked = true
     clickFun()
   }
 }

 myButton = new MyButton(function() {window.master.doAlternateClickThing()}) # Instantiate a new tag, programmatically, and supply custom click function.


 In the above example, we create a custom element class called MyButton,
 which extends the dom to understand tags like <button is="my-button">. (Note: this example
 does NOT establish a tag called <my-button>. The only way to establish new tags in HTML5 seems to be
 to build them off of HTMLElement. If you extend any other kind of element, as we here extend button,
 then you need to us the "is=" syntax instead, which shows extension of a non-basic element.) The first
 line above creates the class object's constructor.

 The second clause defines an onCreate() method for the custom tag class. This is a framework enhancement: the method is always called,
 with 0 args, whenever a new tag object is created either statically or dynamically.

 The third clause defines an afterCreate() method for the custom tag class. This is a framework enhancement: the method is used to
 further initialize new tag objects that are programmatically created. The afterCreate() method is passed all of the args that are
 passed to the constructor, allowing for further customization of the tag object. In this example, it allows the caller
 to establish a click function other than the default. Note that the onCreate() method is *always* called, and, in those cases of programmatic
 creation of new tag objects, the afterCreate() method is then called after the onCreate() method. Note that the onCreate() method cannot
 accept args, because it must be prepared to handle static creation, and no args are passed in the process of static creation.
 NOTE: if afterCreate() returns an object, this object will be used as the return value of the constructor, with behavior analogous
 to the native javascript way of constructing objects.

 The last clause instantiates a new MyButton object, initializing it with a custom click function. Note that the onCreate() and afterCreate() methods
 are not called explicitly. Instead, they are called by the constructor MyButton when we say "new MyButton" (this is a framework enhancement).



 IMPLEMENTATION DETAILS
 The order in which the variables are defined below is important.

 First we need to define the prototype of our new custom element and define all its callback methods before
 calling document.registerElement(), because the prototype object as it exists at the time
 of this call is what will be used to define the callbacks. I'm not sure why this is the case, but it clearly is.
 document.registerElement() must actually do some copying of callbacks from the prototype, putting them elsewhere,
 because subsequent changes to the callbacks in the prototype aren't reflected in the resulting constructor.

 Then we need to call document.registerElement(), which returns the internal constructor for the new element class.
 We need to define internalConstructor so that the function associated with the variable "constructor"
 can reference it via closure.

 IMPLEMENTATION PROBLEM
 There are two distinct modes for custom element creation: static and programmatic. As implemented by the W3 spec,
 the constructor returned by document.registerElement does not pass on to createdCallback() any args that it
 may have been called with. This means that the default mode for object creation is parameterless. We'd like to
 extend this so that we can pass args to custom classes on creation. The simplest approach is to wrap the
 default constructor, which we will now call the "inner" constructor, with an "outer constructor", which then
 passes any args on to an initialize() method which, by convention, we will define for each custom class, and
 which can accept args particular to the class. We'd like it to be the case that this initialize method is called
 regardless of the creation mode: static or programmatic. In static mode, it would be called with 0 args, and it
 would have to figure out proper defaults. In programmatic mode, it would be called with more specific initialization
 args.
 Consider how we might try to implement the above framework. If we're going to pass
 args to an initialization method, we need an "outer" constructor that can accept those args,
 since the "inner" constructor, the one returned by document.registerElement(), will not accept any args.
 But that's okay. We can have the outer constructor accept the args, call the inner constructor with no args,
 and then pass the args on to an initialize() method, which it will call immediately after calling
 the inner constructor.
 But if we do this, what will be the behavior of the inner constructor? It must handle the case of static
 creation of the element from an html doc. In the static case, there will never be a call to the outer constructor,
 only to the inner constructor, which will in turn call the createdCallback() method, again, with 0 args.
 We can put all the default initialization code in the createdCallback() method, and then this static creation
 mode will work just fine. But consider what happens if we then create an object programmatically with the
 outer constructor: it will call the inner constructor, which will call the createdCallback() method, which
 will return an object that has already gone through the default initialization. Then, when the outer constructor
 calls initialize(), it will *re-initialize* the already default-initialized object.
 Further, if we construct our createdCallback() such that it calls initialize() itself (with 0 args, as it must),
 then, in programmatic creation mode, the initialization method would be called twice: first with 0 args from
 the createdCallback() method, and the second time by the outer constructor. It might seem like we could just
 omit the call from the outer constructor, since createdCallback() will *always* be called. We can just let
 *it* call initialize(), but we have no way have passing args to initialize() from within createdCallback!
 */



/*
 Create a new custom class that extends the html tag space.
 customElementName: this is the new tag name, e.g., 'color-choice' would allow for the tag <color-choice>
 parentClass: this is the html parent class. If not supplied, it is HTMLElement. Other examples might be
 HTMLButtonElement or HTMLInputElement. In these latter cases, when you are extending a native HTML class other than
 HTMLButtonELement, you must supply the base tag name of the element being extended, and you must create your new
 custom elements using the "is" attribute of the base tag name. For example, an extension of 'button' called
 'super-button' must be created statically via <button is="super-button">. Using the tag <super-button> won't work.
 extensionType: If this is extending a base tag type such as "button" or "input", specify that here. Note that there is a dependency between the extensionType and the parentClass.

 This method imposes a small framework: classes so defined get the following new methods: onCreate(),
 onAttach(), onDetach(), and onChange(), which are called when the object is created, attached, detached, and changed.
 Classes so-defined also get one additional method imposed by the framework: afterCreate(). This is explained below.

 defCustomTag returns a constructor for the new custom class. You can pass any number of optional args
 to this constructor. After the object is created and given a default initialization by calling its onCreate() method,
 called with 0 args, then the object's afterCreate() method will be called and all the optional args will be passed
 to this method, allow for post-creation initialization that is customized by the args.
 */
function defCustomTag(customElementName, parentClass, extensionType) {
  parentClass = parentClass || HTMLElement

  // Create the new custom class's prototype, and define default do-nothing methods
  var proto = Object.create(parentClass.prototype)
  proto.onCreate = function(){}
  proto.afterCreate = function(){}
  proto.onAttach = function(){}
  proto.onDetach = function(){}
  proto.onChanged = function(name, oldValue, newValue){}

  // onCreate(), onAttach(), and onDetach() are framework enhancements. Call them if they are defined; otherwise, ignore.
  // NOTE: we *have* to define the callbacks below before registering the new element, or they won't be recognized at all.
  // That's why we create the aliases onCreate(), etc., so that a programmer can use defCustomTag and then later define, for example, its onCreate() method.
  proto.createdCallback  = function() {return this.onCreate()}
  proto.attachedCallback = function() {return this.onAttach()}
  proto.detachedCallback = function() {return this.onDetach()}
  proto.attributeChangedCallback = function(name, oldValue, newValue) {
    return this.onChanged(name, oldValue, newValue)
  }

  // Register the new custom tag class. This returns a constructor for it, whose prototype is proto.
  // WARNING: Registration has to happen after the callbacks are defined above. I'm not sure why. But if you reverse the order,
  // the newly created object won't have any callbacks defined. I'm guessing the callbacks are *copied* from the prototype to
  // a different location.
  var internalConstructor = extensionType ?
    document.registerElement(customElementName, {prototype: proto, extends: extensionType}) :
    document.registerElement(customElementName, {prototype: proto})

  // This is the outer constructor, which calls the internal constructor, but which
  // also further initializes the object through calling the afterCreate() method, allowing us to pass
  // initialization args into the constructor and have them be handled by afterCreate().
  var constructor = function() {
    var newObj = new internalConstructor
    return newObj.afterCreate.apply(newObj, arguments) || newObj // If afterCreate() returns an object ,that will be the return value of the constructor.
  }
  constructor.prototype = proto
  constructor.tagName   = customElementName.toUpperCase()  // Tell the class the tag name of its instances.

  return constructor
}
