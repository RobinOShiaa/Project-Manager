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


class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects : Project[];

  constructor(private type: 'active' | 'finished') {
    super('project-list','app',false,`${type}-projects`);
    this.assignedProjects = [];
    this.configure();
    this.renderContent();
    
  }

  renderProjects() {
    const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
    listEl.innerHTML = '';
    for (const projectItem of this.assignedProjects) {
      const listItem = document.createElement('li');
      listItem.textContent = projectItem.title;
      listEl.appendChild(listItem);
    }
  }

  configure() {
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