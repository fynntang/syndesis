import { map, first } from 'rxjs/operators';
import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';

import { ModalService, NavigationService } from '@syndesis/ui/common';
import {
  ApiConnectorState,
  ApiConnectorStore,
  ApiConnectorActions,
  getApiConnectorState,
  CustomConnectorRequest,
  CustomApiConnectorAuthSettings
} from '@syndesis/ui/customizations/api-connector';

import { ApiEditorComponent, ApiDefinition } from 'apicurio-design-studio';
import { OtCommand } from 'oai-ts-commands';

enum WizardSteps {
  UploadSwagger = 1,
  ReviewApiConnector = 2,
  UpdateAuthSettings = 3,
  SubmitRequest = 4
}

@Component({
  selector: 'syndesis-api-connector-create',
  styleUrls: ['./api-connector-create.component.scss'],
  templateUrl: './api-connector-create.component.html'
})
export class ApiConnectorCreateComponent implements OnInit, OnDestroy {
  currentActiveStep = 1;
  apiConnectorState$: Observable<ApiConnectorState>;

  @ViewChild('_apiEditor') _apiEditor: ApiEditorComponent;
  apiDef: ApiDefinition;

  @ViewChild('cancelModalTemplate') cancelModalTemplate: TemplateRef<any>;

  private cancelModalId = 'create-cancellation-modal';

  constructor(
    private apiConnectorStore: Store<ApiConnectorStore>,
    private modalService: ModalService,
    private nav: NavigationService,
    private router: Router
  ) {}


  public apiDefinition(): ApiDefinition {
    return this.apiDef;
  }

  public onUserSelection(selection: string): void {
    console.log('User selection changed: ', selection);
  }

  public onUserChange(command: OtCommand): void {
    console.log('Something happened! ' + JSON.stringify(command));
  }

  public showDefinitionEditor(): boolean {
    return true;
  }

  ngOnInit() {
    this.modalService.registerModal(
      this.cancelModalId,
      this.cancelModalTemplate
    );
    this.apiConnectorState$ = this.apiConnectorStore.select(
      getApiConnectorState
    );

    // Once the request validation results are yielded for the 1st time, we move user to step 2
    this.apiConnectorState$
      .pipe(map(apiConnectorState => apiConnectorState.createRequest))
      .pipe(first(request => !!request && !!request.actionsSummary))
      .subscribe(
        () => (this.currentActiveStep = WizardSteps.ReviewApiConnector)
      );

    // Once the request object is flagged as 'isComplete', we redirect the user to the main listing
    this.apiConnectorState$
      .pipe(map(apiConnectorState => apiConnectorState.createRequest))
      .pipe(first(request => !!request && request.isComplete))
      .subscribe(() => this.redirectBack());
    this.nav.hide();
  }

  showCancelModal(): void {
    this.modalService.show(this.cancelModalId).then(modal => {
      if (modal.result) {
        this.redirectBack();
      }
    });
  }

  onCancel(doCancel: boolean): void {
    this.modalService.hide(this.cancelModalId, doCancel);
  }

  onValidationRequest(request: CustomConnectorRequest) {
    this.apiConnectorStore.dispatch(
      ApiConnectorActions.validateSwagger(request)
    );
  }

  onReviewComplete(): void {
    this.currentActiveStep = WizardSteps.UpdateAuthSettings;
  }

  onAuthSetup(authSettings: CustomApiConnectorAuthSettings): void {
    this.apiConnectorStore.dispatch(
      ApiConnectorActions.updateAuthSettings(authSettings)
    );
    this.currentActiveStep = WizardSteps.SubmitRequest;
  }

  onCreateComplete(customConnectorRequest: CustomConnectorRequest): void {
    this.apiConnectorStore.dispatch(
      ApiConnectorActions.create(customConnectorRequest)
    );
  }

  ngOnDestroy() {
    this.modalService.unregisterModal(this.cancelModalId);
    this.apiConnectorStore.dispatch(ApiConnectorActions.createCancel());
    this.nav.show();
  }

  private redirectBack(): void {
    this.router.navigate(['customizations', 'api-connector']);
  }
}
