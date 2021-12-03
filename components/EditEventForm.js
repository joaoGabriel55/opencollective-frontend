import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { set } from 'lodash';
import { defineMessages, injectIntl } from 'react-intl';

import { convertDateFromApiUtc, convertDateToApiUtc } from '../lib/date-utils';

import Tickets from './edit-collective/sections/Tickets';
import Container from './Container';
import InputField from './InputField';
import StyledButton from './StyledButton';
import TimezonePicker from './TimezonePicker';

class EditEventForm extends React.Component {
  static propTypes = {
    event: PropTypes.object,
    loading: PropTypes.bool,
    onSubmit: PropTypes.func,
    intl: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleTimezoneChange = this.handleTimezoneChange.bind(this);

    const event = { ...(props.event || {}) };
    event.slug = event.slug ? event.slug.replace(/.*\//, '') : '';
    this.state = { event, tiers: event.tiers || [{}], disabled: false, showDeleteModal: false };

    this.messages = defineMessages({
      'slug.label': { id: 'collective.slug.label', defaultMessage: 'url' },
      'type.label': { id: 'event.type.label', defaultMessage: 'Type' },
      'name.label': { id: 'Fields.name', defaultMessage: 'Name' },
      'amount.label': { id: 'Fields.amount', defaultMessage: 'Amount' },
      'description.label': {
        id: 'collective.description.label',
        defaultMessage: 'Short description',
      },
      'longDescription.label': {
        id: 'event.longDescription.label',
        defaultMessage: 'Long description',
      },
      'startsAt.label': {
        id: 'startDateAndTime',
        defaultMessage: 'start date and time',
      },
      'endsAt.label': {
        id: 'event.endsAt.label',
        defaultMessage: 'end date and time',
      },
      'location.label': {
        id: 'event.location.label',
        defaultMessage: 'location',
      },
      'privateInstructions.label': {
        id: 'event.privateInstructions.label',
        defaultMessage: 'Private instructions',
      },
      privateInstructionsDescription: {
        id: 'event.privateInstructions.description',
        defaultMessage: 'These instructions will be provided by email to the participants.',
      },
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.event && (!prevProps.event || this.props.event.name !== prevProps.event.name)) {
      this.setState({ event: this.props.event, tiers: this.props.event.tiers });
    }
  }

  handleChange(fieldname, value) {
    const event = {};
    set(event, fieldname, value);

    if (fieldname === 'startsAt') {
      event[fieldname] = convertDateToApiUtc(value, this.state.event.timezone);
    } else if (fieldname === 'endsAt') {
      event[fieldname] = convertDateToApiUtc(value, this.state.event.timezone);
    } else if (fieldname === 'timezone') {
      if (value) {
        const timezone = this.state.event.timezone;
        const startsAt = this.state.event.startsAt;
        const endsAt = this.state.event.endsAt;
        event.startsAt = convertDateToApiUtc(convertDateFromApiUtc(startsAt, timezone), value);
        event.endsAt = convertDateToApiUtc(convertDateFromApiUtc(endsAt, timezone), value);
        event.timezone = value;
      }
    } else if (fieldname === 'name') {
      if (!event['name'].trim()) {
        this.setState({ disabled: true });
      } else {
        this.setState({ disabled: false });
      }
    }

    this.setState(state => {
      return { event: { ...state.event, ...event } };
    });
  }

  handleTimezoneChange(timezone) {
    this.handleChange('timezone', timezone.value);
  }

  async handleSubmit() {
    this.props.onSubmit({ ...this.state.event, tiers: this.state.tiers });
  }

  getFieldDefaultValue(field) {
    if (field.name === 'startsAt' || field.name === 'endsAt') {
      return field.defaultValue;
    } else {
      return this.state.event[field.name] || field.defaultValue;
    }
  }

  render() {
    const { event, loading, intl } = this.props;

    if (!event.parentCollective) {
      return <div />;
    }

    const isNew = !(event && event.id);
    const submitBtnLabel = loading ? 'loading' : isNew ? 'Create Event' : 'Save';

    this.fields = [
      {
        name: 'name',
        maxLength: 255,
        placeholder: '',
      },
      {
        name: 'description',
        type: 'text',
        maxLength: 255,
        placeholder: '',
      },
      {
        name: 'startsAt',
        type: 'datetime-local',
        defaultValue: dayjs(this.state.event.startsAt).tz(this.state.event.timezone).format('YYYY-MM-DDTHH:mm'),
      },
      {
        name: 'endsAt',
        type: 'datetime-local',
        defaultValue: dayjs(this.state.event.endsAt).tz(this.state.event.timezone).format('YYYY-MM-DDTHH:mm'),
      },
      {
        name: 'timezone',
        type: 'TimezonePicker',
      },
      {
        name: 'location',
        placeholder: '',
        type: 'location',
      },
      {
        name: 'privateInstructions',
        description: intl.formatMessage(this.messages.privateInstructionsDescription),
        type: 'textarea',
        maxLength: 10000,
      },
    ];

    this.fields = this.fields.map(field => {
      if (this.messages[`${field.name}.label`]) {
        field.label = intl.formatMessage(this.messages[`${field.name}.label`]);
      }
      if (this.messages[`${field.name}.description`]) {
        field.description = intl.formatMessage(this.messages[`${field.name}.description`]);
      }
      return field;
    });

    return (
      <div className="EditEventForm">
        <Container maxWidth="700px" margin="0 auto">
          <div className="inputs">
            {this.fields.map(field =>
              field.name === 'timezone' ? (
                <TimezonePicker
                  key={field.name}
                  label="Timezone"
                  selectedTimezone={this.state.event.timezone}
                  onChange={this.handleTimezoneChange}
                  mx="2px"
                  my={2}
                />
              ) : (
                <InputField
                  key={field.name}
                  defaultValue={this.getFieldDefaultValue(field)}
                  validate={field.validate}
                  ref={field.name}
                  name={field.name}
                  label={field.label}
                  description={field.description}
                  placeholder={field.placeholder}
                  type={field.type}
                  pre={field.pre}
                  context={{
                    timezone: this.state.event.timezone,
                  }}
                  onChange={value => this.handleChange(field.name, value)}
                  min={field.min}
                />
              ),
            )}
          </div>
          {['e2e', 'ci'].includes(process.env.OC_ENV) && (
            <Tickets
              title="Tickets"
              tiers={this.state.tiers}
              collective={{ ...event, type: 'EVENT' }}
              currency={event.parentCollective.currency}
              onChange={tiers => this.setState({ tiers })}
            />
          )}
        </Container>
        <Container margin="5rem auto 1rem" textAlign="center">
          <StyledButton
            buttonStyle="primary"
            onClick={this.handleSubmit}
            disabled={this.state.disabled}
            loading={loading}
          >
            {submitBtnLabel}
          </StyledButton>
        </Container>
      </div>
    );
  }
}

export default injectIntl(EditEventForm);
