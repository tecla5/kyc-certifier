import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button } from 'semantic-ui-react';
import store from 'store';
import FileSaver from 'file-saver';
import Dropzone from 'react-dropzone';

import AppContainer from './AppContainer';
import Text from './ui/Text';

@observer
export default class Backup extends Component {
  state = {
    errorMessage: null,
    success: null
  };

  render () {
    const { errorMessage, success } = this.state;

    return (
      <AppContainer
        hideStepper
        showBack
        title='Import or Export your local data'
      >
        <Text.Container>
          <Text>
            Choose whether to import or export your local data. Please be aware that <b>import data will
            erase the current state of your local data</b>! Use with caution (if unsure, export first).
          </Text>

          <center>
            <Button.Group size='big'>
              <Button onClick={this.handleExport}>Export</Button>
              <Button.Or />
              <Dropzone onDrop={this.handleImport} style={{}}>
                <Button positive>Import</Button>
              </Dropzone>
            </Button.Group>
          </center>

          {
            errorMessage
              ? (
                <Text style={{ fontWeight: 'bold', color: 'red', textAlign: 'center' }}>
                  {errorMessage}
                </Text>
              )
              : null
          }

          {
            success
              ? (
                <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
                  Your data has been successfully imported!
                </Text>
              )
              : null
          }
        </Text.Container>
      </AppContainer>
    );
  }

  handleError (message, error) {
    if (error) {
      console.error(error);
    }

    this.setState({ errorMessage: message });
  }

  handleExport = () => {
    this.setState({ errorMessage: null, success: null });

    const data = {};

    store.each((value, key) => {
      data[key] = value;
    });

    const json = JSON.stringify({ data, type: 'picops-backup' });
    const blob = new Blob([ json ], { type: 'application/json;charset=utf-8' });

    FileSaver.saveAs(blob, `PICOPS-${new Date().toISOString()}.json`);
  }

  handleImport = (files) => {
    this.setState({ errorMessage: null, success: null });

    if (!files || !files[0]) {
      return this.handleError(`No file has been selected`);
    }

    const file = files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const fileAsBinaryString = reader.result;
      let data;

      try {
        data = JSON.parse(fileAsBinaryString);
      } catch (error) {
        return this.handleError('The file should be a valid JSON file', error);
      }

      if (data.type !== 'picops-backup' || !data.data) {
        return this.handleError('Invalid JSON file.', data);
      }

      Object.keys(data.data).forEach((key) => {
        const value = data.data[key];

        store.set(key, value);
      });

      this.setState({ success: true });
    };

    reader.onabort = () => {
      this.handleError('File reading was aborted.');
    };

    reader.onerror = (error) => {
      this.handleError('File reading has failed.', error);
    };

    reader.readAsBinaryString(file);
  };
}
