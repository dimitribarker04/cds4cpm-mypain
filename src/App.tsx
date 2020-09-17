import React, { createRef } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import QuestionnaireComponent from './components/questionnaire/QuestionnaireComponent';
import { Questionnaire, QuestionnaireResponse, QuestionnaireResponseItem, QuestionnaireResponseItemAnswer } from './fhir-types/fhir-r4';
// import ContentMyPain from './content/mypain-formtool-2.json';  //mypain-opioid.json';
import { submitQuestionnaireResponse, getQuestionnaire } from './utils/fhirFacadeHelper';
// TODO: add import of  getQuestionnaire 
import PatientContainer from './components/patient/PatientContainer';
import FHIR from "fhirclient";
import Client from "fhirclient/lib/Client";
import { Button } from 'react-bootstrap';

interface AppProps {

}

// TODO: remember to assure that it is a proper questionnaire type
interface AppState {
  Status: string,
  SelectedQuestionnaire?: Questionnaire,
  QuestionnaireResponse: QuestionnaireResponse
}

export default class App extends React.Component<AppProps, AppState> {

  questionnaireContainer: any = createRef();
  constructor(props: AppProps) {
    super(props);
    this.state =
    {
      Status: 'not-started',
      SelectedQuestionnaire: undefined,
      QuestionnaireResponse: {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: []
      }
    };
    this.handleChange = this.handleChange.bind(this);
    this.submitAnswers = this.submitAnswers.bind(this);
  }
  ptRef: string | undefined;
  ptDisplay: any;

  componentDidMount() {
    getQuestionnaire()
    .then(questionnaire => {
      const processQuestionnaire = (p: any) => {
          return (p as Questionnaire)        
      }
      let updatedQuestionnaire = processQuestionnaire(questionnaire);
      console.log('questionnaire: ', questionnaire);
      
    FHIR.oauth2.ready()
      .then((client: Client) => client.patient.read())
      .then((patient) => {
        patient.id ? this.ptRef = patient.id : this.ptRef = " ";
        this.ptDisplay = patient.name[0].given[0] + ' ' + patient.name[0].family;
        return this.selectQuestionnaire(updatedQuestionnaire, this.ptRef, this.ptDisplay);
      });
    })
  }

  selectQuestionnaire(selectedQuestionnaire: Questionnaire, ptRef: string, ptDisplay: string): void {
    this.setState({
      SelectedQuestionnaire: selectedQuestionnaire,
      QuestionnaireResponse: {
        ...this.state.QuestionnaireResponse,
        questionnaire: selectedQuestionnaire.id,
        subject: {
          reference: 'Patient/' + ptRef,
          display: ptDisplay
        },
        item: []
      }
    });
  }

  handleChange(item: QuestionnaireResponseItem, answer?: QuestionnaireResponseItemAnswer[]): void {
    this.setState(state => {
      for (let i = 0; i < state.QuestionnaireResponse.item!.length; i++) {
        if (item.linkId === state.QuestionnaireResponse.item![i].linkId) {
          state.QuestionnaireResponse.item![i] = item;
          state.QuestionnaireResponse.item!.splice(i, 1)
        }
      }
      const QuestionnaireResponse = {
        resourceType: state.QuestionnaireResponse.resourceType,
        status: state.QuestionnaireResponse.status,
        item: state.QuestionnaireResponse.item!.concat(item)
      };
      return {

        QuestionnaireResponse
      }

    }, () => {
      console.log('Questionnaire RESPONSE: ', this.state.QuestionnaireResponse);
    })
  }

  formatDateItem(dateItem: number) {
    let returnDateItem: string;
    dateItem < 10 ? returnDateItem = '0' + dateItem : returnDateItem = dateItem.toString();
    return returnDateItem;
  }
  getCurrentDate() {
    let date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hours = date.getHours();
    let min = date.getMinutes();
    let sec = date.getSeconds();
    let zone = date.getTimezoneOffset() / 60;
    //      "2020-06-19T12:05:43-06:00"
    return year + '-' + this.formatDateItem(month) + '-' + this.formatDateItem(day) + 'T' + this.formatDateItem(hours) + ':' + this.formatDateItem(min) + ':' + this.formatDateItem(sec) + '-' + this.formatDateItem(zone) + ':00';
  }

  startQuestionnaire = () => {
    this.setState({ Status: 'in-progress' }, () => {
      if (this.questionnaireContainer.current) {
        this.questionnaireContainer.current.firstChild.firstChild.nextSibling.classList.add('active');
        this.questionnaireContainer.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    });
  }

  submitAnswers(): void {
    // let returnQuestionnaireResponse = this.state.QuestionnaireResponse;
    this.setState(state => {
      const QuestionnaireResponse = {
        resourceType: state.QuestionnaireResponse.resourceType,
        authored: this.getCurrentDate(),
        status: "completed",
        item: state.QuestionnaireResponse.item
      };
      return {
        QuestionnaireResponse
      }
    }, () => {
      console.log('submitted questionnaire: ', this.state.QuestionnaireResponse)
      submitQuestionnaireResponse(this.state.QuestionnaireResponse);
    })
  }

  setTheme(color: string) {
    document.documentElement.style.setProperty('--color-dark', color);
  }

  public render(): JSX.Element {
    if (this.state.SelectedQuestionnaire) {
      return (
        <div className="app">
          <header className="app-header">
            <p>
              MyPain Development Branch v2
                      </p>
          </header>
          {this.state.Status !== 'in-progress' ? (
            <div>

              <PatientContainer />
              <Button variant="outline-secondary" size='lg' className="next-button" onClick={this.startQuestionnaire}>Next</Button>
            </div>
          ) : (
              <div ref={this.questionnaireContainer}>
                <QuestionnaireComponent questionnaire={this.state.SelectedQuestionnaire}
                  questionnaireResponse={this.state.QuestionnaireResponse}
                  onChange={this.handleChange} onSubmit={this.submitAnswers} />
                <hr />
              </div>
            )}

          <hr />
          {/* <div className="response-container">QuestionnaireResponse: {JSON.stringify(this.state.QuestionnaireResponse)}</div> */}
        </div>
      );
    } else {
      return (
        <div className="app">
          <header className="app-header">
            <p>
              MyPain Development Branch v2
                      </p>
          </header>
          <PatientContainer />
          <hr />
          <div>
          </div>
          <hr />
          {/* <div className="response-container">QuestionnaireResponse: {JSON.stringify(this.state.QuestionnaireResponse)}</div> */}
        </div>
      );
    }
  }
}
