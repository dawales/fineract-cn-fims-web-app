/**
 * Copyright 2017 The Mifos Initiative.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot} from '@angular/router';
import {Injectable} from '@angular/core';
import * as fromOffices from '../../store';
import {Observable} from 'rxjs';
import {of} from 'rxjs/observable/of';
import {OfficesStore} from '../../store/index';
import {TellerService} from '../../../services/teller/teller-service';
import {LoadAction} from '../../store/teller/teller.actions';
import {ExistsGuardService} from '../../../common/guards/exists-guard';

@Injectable()
export class TellerExistsGuard implements CanActivate {

  constructor(private store: OfficesStore,
              private tellerService: TellerService,
              private existsGuardService: ExistsGuardService) {
  }

  hasTellerInStore(id: string): Observable<boolean> {
    const timestamp$: Observable<number> = this.store.select(fromOffices.getTellersLoadedAt)
      .map(loadedAt => loadedAt[id]);

    return this.existsGuardService.isWithinExpiry(timestamp$);
  }

  hasTellerInApi(officeId: string, tellerCode: string): Observable<boolean> {
    const getTeller$: Observable<any> = this.tellerService.find(officeId, tellerCode)
      .map(tellerEntity => new LoadAction({
        resource: tellerEntity
      }))
      .do((action: LoadAction) => this.store.dispatch(action))
      .map(customer => !!customer);

    return this.existsGuardService.routeTo404OnError(getTeller$);
  }

  hasTeller(officeId: string, tellerCode: string): Observable<boolean> {
    return this.hasTellerInStore(tellerCode)
      .switchMap(inStore => {
        if (inStore) {
          return of(inStore);
        }
        return this.hasTellerInApi(officeId, tellerCode);
      });
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.hasTeller(route.parent.params['id'], route.params['code']);
  }
}
