interface Draggable {
  dragStart(e: DragEvent) : void;
  dragEnd(e: DragEvent) : void;
}

interface DragTarget {
  dragOver(e : DragEvent): void;
  drop(e : DragEvent): void;
  dragLeave(e : DragEvent): void;
}

enum ProjectStatus { Active, Finished }

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}


type Listener = (items: Project []) => void;

class ProjectState {
  private projects : Project[] = [];
  private listeners: Listener[] = [];
  private static instance: ProjectState;

  private constructor() {

  }
  static getInstance() {
    if(this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addListener(listenerFn: Listener) {
    this.listeners.push(listenerFn);
  }

  addProject(title: string, description: string, numOfPeople: number){ 
    const newProject = new Project(Math.random().toString(), title, description, numOfPeople,ProjectStatus.Active);
    this.projects.push(newProject);
    this.updateListeners();
  }

  moveProject(projectId: string, newStatus: ProjectStatus) {
    const project = this.projects.find(prj => prj.id === projectId);
    if(project && project.status !== newStatus) {
      project.status = newStatus;
      this.updateListeners();
    }

  }

  private updateListeners() {
    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice());
    }

  }
}

const projectState = ProjectState.getInstance();
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validate(validatableInput: Validatable) {
  let isValid = true;
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }
  if (
    validatableInput.minLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length >= validatableInput.minLength;
  }
  if (
    validatableInput.maxLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length <= validatableInput.maxLength;
  }
  if (
    validatableInput.min != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value >= validatableInput.min;
  }
  if (
    validatableInput.max != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value <= validatableInput.max;
  }
  return isValid;
}

function bindthis(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    }
  };
  return adjDescriptor;
}

abstract class Component<T extends HTMLElement,U extends HTMLElement>{
  templateElem : HTMLTemplateElement;
  hostElem: T;
  element: U;

  constructor (
    template: string, 
    hostElementId: string, 
    insertAtStart: boolean,
    newElementId?: string  
    ) {
    this.templateElem = document.getElementById(template)! as HTMLTemplateElement;
    this.hostElem = document.getElementById(hostElementId)! as T;

    const importedContent = document.importNode(this.templateElem.content, true);
    this.element = importedContent.firstElementChild! as U;
    if(newElementId) {
      this.element.id = newElementId
    }

    this.attach(insertAtStart);

  }

  private attach(insertAtBeginning: boolean) {
    this.hostElem.insertAdjacentElement(insertAtBeginning ? 'afterbegin' : 'beforeend',this.element);
  }

  abstract configure?(): void;
  abstract renderContent() : void;
}

class ProjectItem extends Component<HTMLUListElement, HTMLElement> implements Draggable {
  private project: Project;

  get peopleInvolved() {
    if (this.project.people === 1) {
      return '1 person'
    } else {
      return `${this.project.people} people`
    }
  }
  constructor(hostId: string, project: Project) {
    super('single-project',hostId, false, project.id);
    this.project = project;
    this.configure();
    this.renderContent();
  }

  @bindthis
  dragStart(e: DragEvent) {
    e.dataTransfer!.setData('text/plain',this.project.id)
    e.dataTransfer!.effectAllowed = 'move';
    }
  @bindthis
  dragEnd(e: DragEvent) {
    console.log('dragEnd')

  }
  configure () {
    this.element.addEventListener('dragstart', this.dragStart);
    this.element.addEventListener('dragend', this.dragEnd);

  }

  renderContent() {
    this.element.querySelector('h2')!.textContent = `Title: ${this.project.title}`;
    this.element.querySelector('h3')!.textContent = `Description: ${this.project.description}`;
    this.element.querySelector('p')!.textContent = this.peopleInvolved + " assigned";
  }
}



class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget{
  assignedProjects : Project[];

  constructor(private type: 'active' | 'finished') {
    super('project-list','app',false,`${type}-projects`);
    this.assignedProjects = [];
    this.configure();
    this.renderContent();
    
  }
  @bindthis
  dragOver(e:DragEvent) {
    if(e.dataTransfer && e.dataTransfer.types[0] === 'text/plain') {
      e.preventDefault();
    }
    const listEl = this.element.querySelector('ul')!;
    listEl.classList.add('droppable');
  }

  @bindthis
  drop(e: DragEvent) {
    const prjId = e.dataTransfer!.getData('text/plain');
    projectState.moveProject(prjId,this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished);

  }

  @bindthis
  dragLeave(_: DragEvent) {
    const listEl = this.element.querySelector('ul')!;
    listEl.classList.remove('droppable');


  }
  


  configure() {
    this.element.addEventListener('dragover', this.dragOver)
    this.element.addEventListener('dragleave', this.dragLeave)
    this.element.addEventListener('drop', this.drop)
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter(pr => {
        if(this.type === 'active') {
          return pr.status === ProjectStatus.Active;
        }
        return pr.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }

  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector('ul')!.id = listId;
    this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' PROJECTS';
    console.log(this.type)
  }


  renderProjects() {
    const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
    listEl.innerHTML = '';
    for (const projectItem of this.assignedProjects) {
      new ProjectItem(this.element.querySelector('ul')!.id,projectItem);
    }
  }
}

 


class ProjectInput extends Component<HTMLDivElement,HTMLFormElement>{
  titleInputElem: HTMLInputElement;
  descriptionElem: HTMLInputElement;
  peopleInputElem: HTMLInputElement;
  constructor() {
    super('project-input','app', true,'user-input')
    this.titleInputElem = this.element.querySelector('#title')! as HTMLInputElement;
    this.descriptionElem = this.element.querySelector('#description')! as HTMLInputElement;
    this.peopleInputElem = this.element.querySelector('#people')! as HTMLInputElement;
    this.configure();
  }
  renderContent() {
  }

  private gatherUserInput(): [string,string,number] | void{
    const enteredTitle = this.titleInputElem.value.trim();
    const enteredDescription = this.descriptionElem.value.trim();
    const enteredPeople = this.peopleInputElem.value.trim();

    const titleValidateable : Validatable = {
      value : enteredTitle,
      required: true
    }
    const descriptionValidateable : Validatable = {
      value : enteredDescription,
      required: true,
      minLength: 5
    }
    const peopleValidateable : Validatable = {
      value : +enteredPeople,
      required: true,
      min: 1, 
      max: 5
    }

    if (!validate(titleValidateable) || !validate(descriptionValidateable) || !validate(peopleValidateable) ) {
      alert('Invalid input, please try again!')
      return;
    } else {
      return [enteredTitle, enteredDescription, +enteredPeople]
    }
  }

  private clearInput () {
    this.descriptionElem.value = '';
    this.peopleInputElem.value = '';
    this.titleInputElem.value = '';
  }

  configure () {
    this.element.addEventListener('submit', (e:Event) => {
      e.preventDefault();
      const userInput = this.gatherUserInput();
      if(Array.isArray(userInput)) {
        const [title,desc,people] = userInput;
        projectState.addProject(title,desc,people);
        this.clearInput();

      }
    })
  }
}

const p = new ProjectInput();
const aPL = new ProjectList('active');
const fPL = new ProjectList('finished');